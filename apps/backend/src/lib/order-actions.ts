import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow, refundPaymentWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"
import { RETURNS_MODULE } from "../modules/returns"
import type ReturnsModuleService from "../modules/returns/service"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"
import { cancelCodOrder } from "./cod-orders"
import { getCourier } from "./couriers"
import { capturedAmount, isCod, issueCreditNote, loadDocOrder, payments, refundedAmount } from "./invoices"
import { links, notifyOrder } from "./notify"
import { canCustomerCancel, FeeLine, PaidLine, planReturn, refundable, returnWindow, ReturnPick, undeliveredRefund, UndeliveredCause } from "./order-rules"
import { listEvents, pickupLocation, recordEvent } from "./shipments"

/**
 * Customer cancellations and returns (ARCHITECTURE.md §10). Every status change
 * records the timeline and messages the customer through the messaging layer.
 */
const returns = (c: MedusaContainer) => c.resolve<ReturnsModuleService>(RETURNS_MODULE)
const lock = <T>(c: MedusaContainer, key: string, fn: () => Promise<T>) => c.resolve(Modules.LOCKING).execute(key, fn, { timeout: 30 })
const notAllowed = (m: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, m)

async function ownedOrder(c: MedusaContainer, orderId: string, customerId?: string) {
  const o = await loadDocOrder(c, orderId)
  if (!o) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  if (customerId) {
    const [{ customer_id }] = await c.resolve(Modules.ORDER).listOrders({ id: orderId }, { select: ["customer_id"] })
    if (customer_id !== customerId) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }
  return o
}

async function orderState(c: MedusaContainer, orderId: string, status: string) {
  const events = await listEvents(c, orderId)
  const delivered = events.find((e) => e.status === "delivered")
  return { status, timeline: events.map((e) => e.status as string), deliveredAt: delivered?.occurred_at ?? null }
}

export const returnWindowDays = async (c: MedusaContainer) => (await c.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings()).return_window_days

// ── Cancel ────────────────────────────────────────────────────────────────
export async function customerCancel(c: MedusaContainer, orderId: string, customerId: string) {
  return lock(c, `order-action:${orderId}`, async () => {
    const o = await ownedOrder(c, orderId, customerId)
    const rule = canCustomerCancel(await orderState(c, orderId, o.status))
    if (!rule.ok) throw notAllowed(rule.reason)

    if (isCod(o)) {
      const [conf] = await c.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: orderId })
      if (conf?.status === "pending") return cancelCodOrder(c, orderId, "cancelled by you")
    }
    // Timeline first so the cancellation message carries the reason; Medusa's
    // workflow then releases stock and refunds captured online payments
    // (payment.refunded → credit note + refund message).
    await recordEvent(c, orderId, "cancelled", "customer", { note: "cancelled by you" })
    await cancelOrderWorkflow(c).run({ input: { order_id: orderId } })
    return { status: "cancelled", changed: true, order_display_id: o.display_id }
  })
}

// ── Returns: what can be returned ─────────────────────────────────────────
export async function returnContext(c: MedusaContainer, orderId: string, customerId?: string) {
  const o = await ownedOrder(c, orderId, customerId)
  const windowDays = await returnWindowDays(c)
  const window = returnWindow(await orderState(c, orderId, o.status), windowDays)
  const existing = (await returns(c).listReturnRequests({ order_id: orderId })).filter((r) => r.status !== "rejected")
  const { data: products } = await c.resolve("query").graph({
    entity: "product",
    fields: ["id", "product_specs.not_returnable"],
    filters: { id: [...new Set(o.items.map((i) => i.product_id).filter(Boolean) as string[])] },
  })
  const notReturnable = new Set((products as { id: string; product_specs?: { not_returnable?: boolean | null } | null }[]).filter((p) => p.product_specs?.not_returnable).map((p) => p.id))
  const used = (itemId: string, k: "quantity" | "amount") =>
    existing.flatMap((r) => r.items as unknown as { item_id: string; quantity: number; amount: number }[]).filter((x) => x.item_id === itemId).reduce((a, x) => a + Number(x[k]), 0)

  const lines: (PaidLine & { title: string; thumbnail?: string | null })[] = o.items
    .filter((i) => i.metadata?.type !== "cod_fee")
    .map((i) => ({
      id: i.id,
      title: [i.product_title ?? i.title, i.variant_title && i.variant_title !== "Default variant" ? i.variant_title : null].filter(Boolean).join(" – "),
      quantity: Number(i.quantity),
      total: Number(i.total),
      returnable: !(i.product_id && notReturnable.has(i.product_id)),
      alreadyReturned: used(i.id, "quantity"),
      alreadyRefunded: used(i.id, "amount"),
    }))
  // Shipping + COD fee: refunded only for damaged / wrong items, once per order.
  const shippingPaid = (o.shipping_methods ?? []).reduce((n, s) => n + Number(s.total ?? 0), 0)
  const fees: FeeLine[] = [
    ...(shippingPaid > 0 ? [{ id: "shipping", title: "Shipping", total: shippingPaid, alreadyRefunded: used("shipping", "amount") }] : []),
    ...o.items
      .filter((i) => i.metadata?.type === "cod_fee")
      .map((i) => ({ id: i.id, title: "Cash on Delivery fee", total: Number(i.total), alreadyRefunded: used(i.id, "amount") })),
  ]
  return { order: o, window, windowDays, lines, fees, requests: existing, refundMethod: isCod(o) ? ("manual" as const) : ("original" as const) }
}

// ── Payout details for COD refunds (encrypted at rest) ────────────────────
export type Payout = { method: "upi"; upi_id: string } | { method: "bank"; account_name: string; account_number: string; ifsc: string }

const payoutKey = () => {
  const k = process.env.PAYOUT_ENCRYPTION_KEY
  if (!k) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "PAYOUT_ENCRYPTION_KEY is not set")
  return createHash("sha256").update(k).digest()
}
export function encryptPayout(p: Payout) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", payoutKey(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(p), "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64")).join(".")
}
export function decryptPayout(s: string): Payout {
  const [iv, tag, body] = s.split(".").map((x) => Buffer.from(x, "base64"))
  const d = createDecipheriv("aes-256-gcm", payoutKey(), iv)
  d.setAuthTag(tag)
  return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString("utf8"))
}
export const payoutHint = (p: Payout) =>
  p.method === "upi" ? `UPI ••••${p.upi_id.slice(p.upi_id.indexOf("@") - 2)}` : `Bank a/c ••••${p.account_number.slice(-4)} (${p.ifsc})`

// ── Returns: request ─────────────────────────────────────────────────────
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

export async function createReturnRequest(
  c: MedusaContainer,
  input: { orderId: string; customerId: string; items: ReturnPick[]; reason: string; details?: string | null; photos?: string[]; payout?: Payout | null }
) {
  return lock(c, `order-action:${input.orderId}`, async () => {
    const ctx = await returnContext(c, input.orderId, input.customerId)
    if (!ctx.window.open) throw notAllowed(ctx.window.reason ?? "Returns are closed for this order.")
    const plan = planReturn(ctx.lines, input.items, { reason: input.reason, fees: ctx.fees })
    if (!plan.ok) throw notAllowed(plan.errors.join(". "))
    if (ctx.refundMethod === "manual" && !input.payout) throw notAllowed("Please add your UPI ID or bank details for the refund.")

    const photos: string[] = []
    for (const [i, dataUrl] of (input.photos ?? []).slice(0, 3).entries()) {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
      if (!m || m[2].length > 4_000_000) throw notAllowed("Photos must be JPG, PNG or WebP images under 3 MB.")
      const { result } = await uploadFilesWorkflow(c).run({
        input: { files: [{ filename: `return-${ctx.order.display_id}-${Date.now()}-${i}.${PHOTO_TYPES[m[1]]}`, mimeType: m[1], content: m[2], access: "public" }] },
      })
      photos.push(result[0].url)
    }

    const titles = new Map([...ctx.lines.map((l) => [l.id, l.title] as const), ...ctx.fees.map((f) => [f.id, f.title] as const)])
    const req = await returns(c).createReturnRequests({
      order_id: input.orderId,
      order_number: ctx.order.display_id,
      items: plan.items.map((i) => ({ ...i, title: titles.get(i.item_id) })) as unknown as Record<string, unknown>,
      reason: input.reason,
      details: input.details ?? null,
      photos: photos as unknown as Record<string, unknown>,
      refund_amount: plan.refund,
      refund_method: ctx.refundMethod,
      payout_encrypted: input.payout ? encryptPayout(input.payout) : null,
      payout_hint: input.payout ? payoutHint(input.payout) : null,
    })
    await recordEvent(c, input.orderId, "return_requested", "customer", { notify: false })
    await notifyOrder(c, "return_requested", input.orderId, { link: orderLink(input.orderId) }, { dedupeKey: `return_requested:${req.id}` })
    return req
  })
}

// Short link (keeps SMS under 160 characters): the account's orders list.
const orderLink = (_orderId: string) => `${(process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")}/account/orders`

async function loadRequest(c: MedusaContainer, id: string) {
  const [r] = await returns(c).listReturnRequests({ id })
  if (!r) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Return request not found")
  return r
}

// ── Returns: admin steps ─────────────────────────────────────────────────
export async function approveReturn(c: MedusaContainer, id: string, note?: string | null) {
  return lock(c, `return:${id}`, async () => {
    const r = await loadRequest(c, id)
    if (r.status !== "requested") throw notAllowed(`This return is already ${r.status}.`)
    const o = (await loadDocOrder(c, r.order_id))!
    const courier = await getCourier(c)
    const pickup = await pickupLocation(c)
    if (!pickup) throw notAllowed("Set the warehouse address in Settings → Locations first.")
    const a = o.shipping_address ?? {}
    const items = r.items as unknown as { item_id: string; title: string; quantity: number; amount: number }[]
    const result = await courier.createReturnPickup({
      orderNumber: String(r.order_number),
      returnId: r.id,
      from: { name: [a.first_name, a.last_name].filter(Boolean).join(" "), phone: a.phone ?? "", address1: a.address_1 ?? "", address2: a.address_2, city: a.city ?? "", state: a.province ?? "", pincode: a.postal_code ?? "" },
      to: { ...pickup, nickname: null },
      items: items.map((i) => ({ name: i.title, sku: i.item_id, quantity: i.quantity, unitPrice: Number(i.amount) / i.quantity })),
      weightGrams: 250 * items.reduce((n, i) => n + i.quantity, 0), // ponytail: flat 250 g per returned item
    })
    const updated = await returns(c).updateReturnRequests({ id, status: "approved", admin_note: note ?? null, pickup_awb: result.awb, pickup_courier: result.courierName })
    await notifyOrder(c, "return_approved", r.order_id, { awb: result.awb, link: orderLink(r.order_id) }, { dedupeKey: `return_approved:${id}` })
    return updated
  })
}

export async function rejectReturn(c: MedusaContainer, id: string, note: string) {
  return lock(c, `return:${id}`, async () => {
    const r = await loadRequest(c, id)
    if (r.status !== "requested") throw notAllowed(`This return is already ${r.status}.`)
    const updated = await returns(c).updateReturnRequests({ id, status: "rejected", admin_note: note, payout_encrypted: null })
    await notifyOrder(c, "return_rejected", r.order_id, { reason: note, link: links.help() }, { dedupeKey: `return_rejected:${id}` })
    return updated
  })
}

/** Item(s) back at the warehouse. Prepaid: refunds through the payment provider right away. */
export async function receiveReturn(c: MedusaContainer, id: string) {
  const r = await lock(c, `return:${id}`, async () => {
    const r = await loadRequest(c, id)
    if (r.status !== "approved") throw notAllowed(r.status === "requested" ? "Approve the return first." : `This return is already ${r.status}.`)
    const updated = await returns(c).updateReturnRequests({ id, status: "received" })
    await recordEvent(c, r.order_id, "returned", "admin", { notify: false })
    await notifyOrder(c, "return_received", r.order_id, { link: orderLink(r.order_id) }, { dedupeKey: `return_received:${id}` })
    return updated
  })
  return r.refund_method === "original" ? refundReturn(c, id) : r
}

/**
 * Refund for a received return. "original": through the payment provider,
 * idempotent per return (no double refund). "manual" (COD): admin has paid the
 * customer's UPI / bank account; the payout details are then deleted.
 */
export async function refundReturn(c: MedusaContainer, id: string, reference?: string | null) {
  return lock(c, `return:${id}`, async () => {
    const r = await loadRequest(c, id)
    if (r.status === "refunded") return r
    if (r.status !== "received") throw notAllowed("Mark the return as received first.")
    const o = (await loadDocOrder(c, r.order_id))!
    let amount = Number(r.refund_amount)

    if (r.refund_method === "original") {
      const payment = payments(o).find((p) => p.captured_at)
      if (!payment) throw notAllowed("No captured payment to refund.")
      amount = refundable(capturedAmount(o), refundedAmount(o), amount)
      if (amount > 0) await refundPaymentWorkflow(c).run({ input: { payment_id: payment.id, amount, idempotency_key: `return:${id}`, note: `Return ${id}` } })
    }
    const items = r.items as unknown as { item_id: string; quantity: number; amount: number }[]
    await issueCreditNote(c, { orderId: r.order_id, sourceKey: `return:${id}`, amount, reason: `Return of ${items.reduce((n, i) => n + i.quantity, 0)} item(s)`, items })
    const updated = await returns(c).updateReturnRequests({
      id,
      status: "refunded",
      refund_amount: amount,
      refunded_at: new Date(),
      payout_encrypted: null, // never keep bank details longer than needed
      admin_note: reference ? [r.admin_note, `Refund reference: ${reference}`].filter(Boolean).join("\n") : r.admin_note,
    })
    await recordEvent(c, r.order_id, "refunded", "admin", { notify: false })
    await notifyOrder(c, "refund_processed", r.order_id, { amount: amount.toLocaleString("en-IN") }, { dedupeKey: `refund_processed:return:${id}` })
    return updated
  })
}

// ── Undelivered prepaid parcels (RTO) ────────────────────────────────────
const CAUSE_TEXT: Record<UndeliveredCause, string> = {
  courier_failed: "Undelivered – courier could not deliver",
  customer_refused: "Undelivered – refused at delivery",
  wrong_address: "Undelivered – incorrect address",
}

/**
 * Prepaid order returned to us undelivered: full refund if the courier failed;
 * refund minus the shipping charge if the customer refused it or the address
 * was wrong. Through the payment provider, once per order (idempotency key);
 * credit note + message follow from the payment.refunded event.
 */
export async function refundUndelivered(c: MedusaContainer, orderId: string, cause: UndeliveredCause) {
  return lock(c, `order-action:${orderId}`, async () => {
    const o = await loadDocOrder(c, orderId)
    if (!o) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
    if (isCod(o)) throw notAllowed("Cash on Delivery orders weren't paid, so there's nothing to refund.")
    const timeline = (await listEvents(c, orderId)).map((e) => e.status as string)
    if (!timeline.includes("rto")) throw notAllowed("Only for parcels returned to us undelivered (RTO).")
    const payment = payments(o).find((p) => p.captured_at)
    if (!payment) throw notAllowed("No captured payment to refund.")
    const shipping = (o.shipping_methods ?? []).reduce((n, s) => n + Number(s.total ?? 0), 0)
    const { amount, deduction } = undeliveredRefund(cause, { captured: capturedAmount(o), refunded: refundedAmount(o), shipping })
    if (amount <= 0) return { refunded: 0, deduction, already: true }
    await refundPaymentWorkflow(c).run({ input: { payment_id: payment.id, amount, idempotency_key: `rto:${orderId}`, note: CAUSE_TEXT[cause] } })
    return { refunded: amount, deduction, already: false }
  })
}
