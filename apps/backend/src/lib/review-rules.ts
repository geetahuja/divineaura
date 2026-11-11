// Review rules (ARCHITECTURE.md §5 rule 10). Pure and unit-tested.

export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden"

/** Verified buyer: the order item was delivered, and has no review yet. */
export function canReview(input: { delivered: boolean; orderCancelled: boolean; existing?: { status: ReviewStatus } | null }) {
  if (input.orderCancelled) return { ok: false as const, reason: "Cancelled orders can't be reviewed." }
  if (!input.delivered) return { ok: false as const, reason: "You can review this product once it has been delivered." }
  if (input.existing) return { ok: false as const, reason: "You have already reviewed this item." }
  return { ok: true as const }
}

/** A review can be edited by its author only until it is approved (or rejected/hidden). */
export const canEdit = (status: ReviewStatus) => status === "pending"

/** "Priya S., Nashik" — first name, surname initial, city. Never the full name, phone or email. */
export function publicName(first?: string | null, last?: string | null, city?: string | null) {
  const f = (first ?? "").trim().split(/\s+/)[0]
  if (!f) return "Verified buyer"
  const name = f[0].toUpperCase() + f.slice(1).toLowerCase()
  const initial = (last ?? "").trim()[0]?.toUpperCase()
  const c = (city ?? "").trim()
  return `${name}${initial ? ` ${initial}.` : ""}${c ? `, ${c[0].toUpperCase()}${c.slice(1)}` : ""}`
}

export type Summary = { count: number; average: number; breakdown: Record<1 | 2 | 3 | 4 | 5, number> }

/** Average (one decimal) and the number of reviews per star. */
export function summarize(ratings: number[]): Summary {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Summary["breakdown"]
  for (const r of ratings) if (r >= 1 && r <= 5) breakdown[Math.round(r) as 1] += 1
  const count = Object.values(breakdown).reduce((a, n) => a + n, 0)
  const sum = (Object.entries(breakdown) as [string, number][]).reduce((a, [s, n]) => a + Number(s) * n, 0)
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, breakdown }
}

/** Blocked words (admin list, one per line or comma separated), matched as whole words, case-insensitive. */
export function findBlockedWord(text: string, list: string): string | null {
  const words = list.split(/[\n,]/).map((w) => w.trim().toLowerCase()).filter(Boolean)
  const t = text.toLowerCase()
  for (const w of words) {
    // Word boundaries only where the entry itself starts/ends with a letter or digit ("casino" vs "http://").
    const alnum = /[\p{L}\p{N}]/u
    const left = alnum.test(w[0]) ? "(^|[^\\p{L}\\p{N}])" : ""
    const right = alnum.test(w[w.length - 1]) ? "($|[^\\p{L}\\p{N}])" : ""
    const re = new RegExp(`${left}${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${right}`, "u")
    if (re.test(t)) return w
  }
  return null
}

export const REVIEW_LIMITS = { perCustomerPerDay: 10, perIpPerMinute: 3, maxPhotos: 4, maxPhotoBytes: 2_000_000, titleMax: 120, bodyMax: 3000 }

/** Coupon incentive: only after approval, any rating; optionally requires a photo. */
export const qualifiesForIncentive = (s: { incentive_enabled: boolean; incentive_requires_photo: boolean }, r: { photos: string[]; incentive_code?: string | null }) =>
  s.incentive_enabled && !r.incentive_code && (!s.incentive_requires_photo || r.photos.length > 0)
