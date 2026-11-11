import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { randomBytes } from "node:crypto"
import { REVIEWS_MODULE } from "../modules/reviews"
import type ReviewsModuleService from "../modules/reviews/service"
import { stripImageMetadata } from "./image-privacy"
import { links, notifyOrder } from "./notify"
import { canEdit, canReview, findBlockedWord, publicName, qualifiesForIncentive, REVIEW_LIMITS, ReviewStatus, summarize } from "./review-rules"
import { listEvents } from "./shipments"
import { SHIPPING_MODULE } from "../modules/shipping"
import type ShippingModuleService from "../modules/shipping/service"

/**
 * Product reviews (ARCHITECTURE.md §5 rule 10, §7). Verified buyers only: one
 * review per delivered order item, pending until an admin approves it. Admins
 * moderate and reply but can never change what the customer wrote.
 */
const svc = (c: MedusaContainer) => c.resolve<ReviewsModuleService>(REVIEWS_MODULE)
const query = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY)
const notAllowed = (m: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, m)

type OrderForReview = {
  id: string
  display_id: number
  status: string
  customer_id: string | null
  shipping_address?: { city?: string | null } | null
  items: { id: string; title: string; product_title?: string | null; product_id?: string | null; product_handle?: string | null; thumbnail?: string | null; metadata?: Record<string, unknown> | null }[]
}

async function loadOrder(c: MedusaContainer, orderId: string, customerId: string) {
  const { data } = await query(c).graph({
    entity: "order",
    fields: ["id", "display_id", "status", "customer_id", "shipping_address.city", "items.id", "items.title", "items.product_title", "items.product_id", "items.product_handle", "items.thumbnail", "items.metadata"],
    filters: { id: orderId },
  })
  const o = data[0] as unknown as OrderForReview | undefined
  if (!o || o.customer_id !== customerId) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  return o
}

const isDelivered = async (c: MedusaContainer, orderId: string) => (await listEvents(c, orderId)).some((e) => e.status === "delivered")

/** The order's products with whether each can be reviewed, and the customer's existing review. */
export async function reviewableItems(c: MedusaContainer, orderId: string, customerId: string) {
  const o = await loadOrder(c, orderId, customerId)
  const delivered = await isDelivered(c, orderId)
  const items = o.items.filter((i) => i.metadata?.type !== "cod_fee" && i.product_id)
  const existing = await svc(c).listReviews({ order_item_id: items.map((i) => i.id) })
  return items.map((i) => {
    const review = existing.find((r) => r.order_item_id === i.id) ?? null
    const rule = canReview({ delivered, orderCancelled: o.status === "canceled", existing: review })
    return {
      item_id: i.id,
      product_id: i.product_id!,
      product_handle: i.product_handle ?? null,
      title: i.product_title ?? i.title,
      thumbnail: i.thumbnail ?? null,
      can_review: rule.ok,
      reason: rule.ok ? null : review ? null : rule.reason,
      review: review ? toOwnView(review) : null,
    }
  })
}

type ReviewRow = Awaited<ReturnType<ReviewsModuleService["listReviews"]>>[number]
const toOwnView = (r: ReviewRow) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  photos: r.photos as unknown as string[],
  display_name: r.display_name,
  status: r.status,
  editable: canEdit(r.status as ReviewStatus),
  reply: r.status === "approved" ? r.reply : null,
})

/** Decodes data URLs, refuses non-images, strips EXIF/GPS, uploads to the product-image storage. */
async function savePhotos(c: MedusaContainer, dataUrls: string[], tag: string) {
  const urls: string[] = []
  for (const [i, d] of dataUrls.entries()) {
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(d)
    if (!m) throw notAllowed("Photos must be JPG, PNG or WebP images.")
    const clean = stripImageMetadata(Buffer.from(m[1], "base64"))
    if (!clean) throw notAllowed("Photos must be JPG, PNG or WebP images.")
    if (clean.data.length > REVIEW_LIMITS.maxPhotoBytes) throw notAllowed("Each photo must be under 2 MB.")
    const ext = clean.type.split("/")[1].replace("jpeg", "jpg")
    const { result } = await uploadFilesWorkflow(c).run({
      input: { files: [{ filename: `review-${tag}-${Date.now()}-${i}.${ext}`, mimeType: clean.type, content: clean.data.toString("base64"), access: "public" }] },
    })
    urls.push(result[0].url)
  }
  return urls
}

export type ReviewInput = { rating: number; title?: string | null; body: string; photos?: string[]; keep_photos?: string[]; show_name: boolean }

async function validateText(c: MedusaContainer, input: ReviewInput) {
  const s = await svc(c).getSettings()
  const body = input.body.trim()
  if (body.length < s.min_body_length) throw notAllowed(`Please write at least ${s.min_body_length} characters about the product.`)
  const blocked = findBlockedWord(`${input.title ?? ""} ${body}`, s.blocked_words)
  if (blocked) throw notAllowed("Your review contains words or links we can't publish. Please edit it and try again.")
}

export async function createReview(c: MedusaContainer, customerId: string, orderId: string, orderItemId: string, input: ReviewInput, ip: string | null) {
  const day = new Date(Date.now() - 86_400_000)
  if ((await svc(c).listReviews({ customer_id: customerId, created_at: { $gte: day } }, { select: ["id"] })).length >= REVIEW_LIMITS.perCustomerPerDay)
    throw notAllowed("You've written a lot of reviews today. Please try again tomorrow.")
  if (ip && (await svc(c).listReviews({ ip, created_at: { $gte: new Date(Date.now() - 60_000) } }, { select: ["id"] })).length >= REVIEW_LIMITS.perIpPerMinute)
    throw notAllowed("Please wait a minute before posting another review.")

  return c.resolve(Modules.LOCKING).execute(`review:${orderItemId}`, async () => {
    const items = await reviewableItems(c, orderId, customerId) // also checks the order is theirs
    const item = items.find((i) => i.item_id === orderItemId)
    if (!item) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order item not found")
    if (!item.can_review) throw notAllowed(item.reason ?? "You have already reviewed this item.")
    await validateText(c, input)
    if ((input.photos?.length ?? 0) > REVIEW_LIMITS.maxPhotos) throw notAllowed(`Up to ${REVIEW_LIMITS.maxPhotos} photos.`)
    const o = await loadOrder(c, orderId, customerId)
    const customer = await c.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)
    const photos = await savePhotos(c, input.photos ?? [], String(o.display_id))
    return svc(c).createReviews({
      product_id: item.product_id,
      order_id: o.id,
      order_number: o.display_id,
      order_item_id: orderItemId,
      customer_id: customerId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      photos: photos as unknown as Record<string, unknown>,
      display_name: input.show_name ? publicName(customer.first_name, customer.last_name, o.shipping_address?.city) : "Verified buyer",
      ip,
    })
  })
}

/** The author may edit until the review is approved; it stays pending. */
export async function updateReview(c: MedusaContainer, customerId: string, reviewId: string, input: ReviewInput) {
  const [r] = await svc(c).listReviews({ id: reviewId, customer_id: customerId })
  if (!r) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review not found")
  if (!canEdit(r.status as ReviewStatus)) throw notAllowed("This review has already been moderated and can no longer be edited.")
  await validateText(c, input)
  const kept = (r.photos as unknown as string[]).filter((u) => input.keep_photos?.includes(u))
  if (kept.length + (input.photos?.length ?? 0) > REVIEW_LIMITS.maxPhotos) throw notAllowed(`Up to ${REVIEW_LIMITS.maxPhotos} photos.`)
  const added = await savePhotos(c, input.photos ?? [], String(r.order_number))
  // Photos the customer removed are deleted from storage, not just unlinked.
  const removed = (r.photos as unknown as string[]).filter((u) => !kept.includes(u))
  if (removed.length) await c.resolve(Modules.FILE).deleteFiles(removed.map((u) => u.split("/").pop()!)).catch(() => {})
  const customer = await c.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)
  const { data } = await query(c).graph({ entity: "order", fields: ["shipping_address.city"], filters: { id: r.order_id } })
  return svc(c).updateReviews({
    id: r.id,
    rating: input.rating,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    photos: [...kept, ...added] as unknown as Record<string, unknown>,
    display_name: input.show_name ? publicName(customer.first_name, customer.last_name, (data[0] as { shipping_address?: { city?: string } })?.shipping_address?.city) : "Verified buyer",
  })
}

// ── Moderation (admin) ────────────────────────────────────────────────────
async function getReview(c: MedusaContainer, id: string) {
  const [r] = await svc(c).listReviews({ id })
  if (!r) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review not found")
  return r
}

export async function moderate(c: MedusaContainer, id: string, action: "approve" | "reject" | "hide", reason?: string | null) {
  const r = await getReview(c, id)
  if (action === "reject" && !reason?.trim()) throw notAllowed("Add a reason (only admins see it).")
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden"
  const updated = await svc(c).updateReviews({
    id,
    status,
    reject_reason: action === "approve" ? null : (reason?.trim() ?? r.reject_reason),
    approved_at: action === "approve" ? (r.approved_at ?? new Date()) : r.approved_at,
  })
  if (action === "approve") {
    await maybeIssueCoupon(c, updated.id)
    return getReview(c, id) // includes the coupon code when one was issued
  }
  return updated
}

export async function reply(c: MedusaContainer, id: string, text: string | null) {
  await getReview(c, id)
  return svc(c).updateReviews({ id, reply: text?.trim() || null, replied_at: text?.trim() ? new Date() : null })
}

/** Optional incentive: single-use coupon after approval (any rating), messaged to the customer. */
async function maybeIssueCoupon(c: MedusaContainer, id: string) {
  const s = await svc(c).getSettings()
  const r = await getReview(c, id)
  if (!qualifiesForIncentive(s, { photos: r.photos as unknown as string[], incentive_code: r.incentive_code })) return
  const code = `REVIEW-${randomBytes(4).toString("hex").toUpperCase()}`
  await c.resolve(Modules.PROMOTION).createPromotions({
    code,
    type: "standard",
    status: "active",
    is_automatic: false,
    limit: 1,
    application_method: { type: "percentage", target_type: "order", value: s.incentive_percent },
  } as never)
  await svc(c).updateReviews({ id, incentive_code: code })
  await notifyOrder(c, "review_coupon", r.order_id, { code, percent: String(s.incentive_percent) }, { dedupeKey: `review_coupon:${id}` })
}

// ── Public (approved only) ────────────────────────────────────────────────
const toPublic = (r: ReviewRow) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  photos: r.photos as unknown as string[],
  author: r.display_name,
  verified: true, // every review comes from a delivered order
  created_at: r.created_at,
  reply: r.reply,
  replied_at: r.replied_at,
  incentivized: !!r.incentive_code,
})
export type PublicReview = ReturnType<typeof toPublic>

export type Sort = "newest" | "highest" | "lowest" | "photos"

// ponytail: aggregates are computed from approved rows in memory — fine for
// thousands of reviews; add a cached summary table if a product gets far more.
export async function productReviews(c: MedusaContainer, productId: string, sort: Sort, offset: number, limit: number) {
  const all = await svc(c).listReviews({ product_id: productId, status: "approved" }, { order: { approved_at: "DESC" } })
  const summary = summarize(all.map((r) => r.rating))
  const sorted =
    sort === "highest"
      ? [...all].sort((a, b) => b.rating - a.rating)
      : sort === "lowest"
        ? [...all].sort((a, b) => a.rating - b.rating)
        : sort === "photos"
          ? all.filter((r) => (r.photos as unknown as string[]).length)
          : all
  return { summary, count: sorted.length, reviews: sorted.slice(offset, offset + limit).map(toPublic) }
}

/** { product_id: { count, average } } for product cards. */
export async function ratingSummaries(c: MedusaContainer) {
  const rows = await svc(c).listReviews({ status: "approved" }, { select: ["product_id", "rating"] })
  const by = new Map<string, number[]>()
  for (const r of rows) by.set(r.product_id, [...(by.get(r.product_id) ?? []), r.rating])
  return Object.fromEntries([...by].map(([id, rs]) => [id, (({ count, average }) => ({ count, average }))(summarize(rs))]))
}

/** Approved reviews with photos for the homepage, with the product they're about. */
export async function photoReviews(c: MedusaContainer, limit: number) {
  const rows = (await svc(c).listReviews({ status: "approved" }, { order: { approved_at: "DESC" }, take: 50 })).filter((r) => (r.photos as unknown as string[]).length).slice(0, limit)
  if (!rows.length) return []
  const { data } = await query(c).graph({ entity: "product", fields: ["id", "title", "handle", "status"], filters: { id: [...new Set(rows.map((r) => r.product_id))] } })
  const products = new Map((data as { id: string; title: string; handle: string; status: string }[]).filter((p) => p.status === "published").map((p) => [p.id, p]))
  return rows.filter((r) => products.has(r.product_id)).map((r) => ({ ...toPublic(r), product: { title: products.get(r.product_id)!.title, handle: products.get(r.product_id)!.handle } }))
}

// ── Review request (one per order, X days after delivery) ────────────────
export async function sendDueReviewRequests(c: MedusaContainer, now = new Date()) {
  const s = await svc(c).getSettings()
  const due = new Date(now.getTime() - s.request_after_days * 86_400_000)
  const since = new Date(due.getTime() - 30 * 86_400_000) // don't wake up very old orders
  const delivered = await c.resolve<ShippingModuleService>(SHIPPING_MODULE).listOrderEvents({ status: "delivered", occurred_at: { $lte: due, $gte: since } })
  let sent = 0
  for (const { order_id } of delivered) {
    const [already] = await svc(c).listReviewRequests({ order_id })
    if (already) continue
    const { data: [o] } = await query(c).graph({ entity: "order", fields: ["id", "status", "items.id", "items.metadata"], filters: { id: order_id } })
    const order = o as { status: string; items: { id: string; metadata?: Record<string, unknown> | null }[] } | undefined
    if (!order || order.status === "canceled") continue
    const itemIds = order.items.filter((i) => i.metadata?.type !== "cod_fee").map((i) => i.id)
    const reviewed = await svc(c).listReviews({ order_item_id: itemIds }, { select: ["id"] })
    if (reviewed.length >= itemIds.length) continue // already reviewed everything
    await svc(c).createReviewRequests({ order_id, sent_at: now }) // first: never twice, even if the send fails
    await notifyOrder(c, "review_request", order_id, { link: links.account() }, { dedupeKey: `review_request:${order_id}` })
    sent++
  }
  return sent
}
