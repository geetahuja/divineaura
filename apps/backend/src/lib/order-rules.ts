// Cancellation, return and refund rules (ARCHITECTURE.md §5, §10). Pure and unit-tested.
import { round2 } from "./gst-invoice"

export type OrderState = {
  status: string // Medusa order status
  timeline: string[] // recorded timeline statuses
  deliveredAt?: Date | string | null
}

/** Customers may cancel until the order is packed. */
export function canCustomerCancel(o: OrderState): { ok: true } | { ok: false; reason: string } {
  if (o.status === "canceled" || o.timeline.includes("cancelled")) return { ok: false, reason: "This order is already cancelled." }
  if (["packed", "shipped", "out_for_delivery", "delivered", "rto"].some((s) => o.timeline.includes(s)))
    return { ok: false, reason: "This order is already packed, so it can no longer be cancelled. You can request a return after delivery." }
  return { ok: true }
}

/** Returns open on delivery and close `windowDays` days later. */
export function returnWindow(o: OrderState, windowDays: number, now = new Date()) {
  if (!o.timeline.includes("delivered") || !o.deliveredAt) return { open: false as const, reason: "Returns can be requested after delivery." }
  const closes = new Date(new Date(o.deliveredAt).getTime() + windowDays * 86_400_000)
  if (now.getTime() > closes.getTime()) return { open: false as const, reason: `The ${windowDays}-day return window closed on ${closes.toLocaleDateString("en-IN")}.`, closes }
  return { open: true as const, closes }
}

export type PaidLine = {
  id: string
  quantity: number
  total: number // what the customer paid for the line (GST-inclusive, after prepaid/other discounts)
  returnable: boolean
  alreadyReturned: number // quantity in earlier (non-rejected) return requests
  alreadyRefunded: number // amount already refunded for this line
}

export type ReturnPick = { item_id: string; quantity: number }

/**
 * Validates a return request and works out the refund: each item refunds its
 * paid share (after discounts); shipping and the COD fee are not refunded on
 * returns. A line can never be returned or refunded beyond what was bought/paid.
 */
// Our mistake (damaged in transit / wrong item sent): always accepted, and
// shipping + the COD fee are refunded too (once per order).
export const OUR_FAULT_REASONS = ["damaged", "wrong_item"] as const
export const isOurFault = (reason?: string | null) => (OUR_FAULT_REASONS as readonly string[]).includes(reason ?? "")

/** Fee lines (shipping, COD fee) and how much of each has already been refunded. */
export type FeeLine = { id: string; title: string; total: number; alreadyRefunded: number }

export function planReturn(lines: PaidLine[], picks: ReturnPick[], opts: { reason?: string | null; fees?: FeeLine[] } = {}) {
  const errors: string[] = []
  const items: { item_id: string; quantity: number; amount: number; title?: string }[] = []
  const ourFault = isOurFault(opts.reason)
  for (const p of picks) {
    const l = lines.find((x) => x.id === p.item_id)
    if (!l) { errors.push("Unknown item"); continue }
    if (!l.returnable && !ourFault) { errors.push("This item is not returnable"); continue }
    if (!Number.isInteger(p.quantity) || p.quantity < 1) { errors.push("Choose a quantity"); continue }
    if (p.quantity > l.quantity - l.alreadyReturned) { errors.push("You can't return more than you bought"); continue }
    const unit = l.total / l.quantity
    const amount = round2(Math.min(unit * p.quantity, l.total - l.alreadyRefunded))
    items.push({ item_id: l.id, quantity: p.quantity, amount: Math.max(0, amount) })
  }
  if (!picks.length) errors.push("Choose at least one item")
  if (ourFault && items.length) {
    for (const f of opts.fees ?? []) {
      const amount = round2(f.total - f.alreadyRefunded)
      if (amount > 0) items.push({ item_id: f.id, quantity: 1, amount, title: f.title })
    }
  }
  return { ok: errors.length === 0, errors, items, refund: round2(items.reduce((a, i) => a + i.amount, 0)) }
}

export type UndeliveredCause = "courier_failed" | "customer_refused" | "wrong_address"

/**
 * Prepaid parcel came back undelivered (RTO): full refund when the courier
 * failed; refund minus the shipping charge when the customer refused it or
 * gave a wrong address. Never more than is still refundable.
 */
export function undeliveredRefund(cause: UndeliveredCause, p: { captured: number; refunded: number; shipping: number }) {
  const deduction = cause === "courier_failed" ? 0 : round2(p.shipping)
  // Total due is captured − deduction; pay only what hasn't been refunded yet.
  return { deduction, amount: refundable(p.captured, p.refunded, p.captured - deduction - p.refunded) }
}

/** Never refund more than was captured minus earlier refunds. */
export const refundable = (captured: number, refunded: number, wanted: number) => round2(Math.max(0, Math.min(wanted, captured - refunded)))
