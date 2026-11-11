"use server"

import { sdk } from "@lib/config"
import { refresh } from "next/cache"
import { getAuthHeaders } from "./cookies"

// Public review data is approved-only (enforced by the backend) and cached for a
// minute, so an approval shows on the site within ~60 s.
const cached = { next: { revalidate: 60 }, cache: "force-cache" as const }

export type Summary = { count: number; average: number; breakdown: Record<"1" | "2" | "3" | "4" | "5", number> }
export type PublicReview = {
  id: string
  rating: number
  title: string | null
  body: string
  photos: string[]
  author: string
  verified: boolean
  created_at: string
  reply: string | null
  replied_at: string | null
  incentivized: boolean
}
export type ReviewSort = "newest" | "highest" | "lowest" | "photos"
export type ReviewPage = { summary: Summary; count: number; reviews: PublicReview[] }

const EMPTY: ReviewPage = { summary: { count: 0, average: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, count: 0, reviews: [] }

export async function getProductReviews(productId: string, sort: ReviewSort = "newest", offset = 0, limit = 5): Promise<ReviewPage> {
  return sdk.client
    .fetch<ReviewPage>(`/store/products/${productId}/reviews`, { query: { sort, offset, limit }, ...cached })
    .catch(() => EMPTY)
}

export async function getRatingSummaries(): Promise<Record<string, { count: number; average: number }>> {
  return sdk.client
    .fetch<{ summaries: Record<string, { count: number; average: number }> }>("/store/reviews/summaries", cached)
    .then((r) => r.summaries)
    .catch(() => ({}))
}

export type PhotoReview = PublicReview & { product: { title: string; handle: string } }
export async function getPhotoReviews(limit = 8): Promise<PhotoReview[]> {
  return sdk.client
    .fetch<{ reviews: PhotoReview[] }>("/store/reviews/photos", { query: { limit }, ...cached })
    .then((r) => r.reviews)
    .catch(() => [])
}

// ── Customer ─────────────────────────────────────────────────────────────
export type OwnReview = { id: string; rating: number; title: string | null; body: string; photos: string[]; display_name: string; status: string; editable: boolean; reply: string | null }
export type ReviewableItem = {
  item_id: string
  product_id: string
  product_handle: string | null
  title: string
  thumbnail: string | null
  can_review: boolean
  reason: string | null
  review: OwnReview | null
}

export async function getReviewableItems(orderId: string): Promise<ReviewableItem[]> {
  return sdk.client
    .fetch<{ items: ReviewableItem[] }>(`/store/customers/me/orders/${orderId}/reviews`, { headers: await getAuthHeaders(), cache: "no-store" })
    .then((r) => r.items)
    .catch(() => [])
}

export type ReviewPayload = { rating: number; title?: string; body: string; photos?: string[]; keep_photos?: string[]; show_name: boolean }

export async function saveReview(target: { order_id: string; item_id: string } | { review_id: string }, payload: ReviewPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const headers = await getAuthHeaders()
    if ("review_id" in target) await sdk.client.fetch(`/store/customers/me/reviews/${target.review_id}`, { method: "POST", headers, body: payload })
    else await sdk.client.fetch("/store/customers/me/reviews", { method: "POST", headers, body: { ...target, ...payload } })
    refresh()
    return { ok: true }
  } catch (e) {
    const m = (e as Error)?.message ?? ""
    return { ok: false, error: m && !/^\d{3}$/.test(m) ? m : "Could not save your review. Please try again." }
  }
}
