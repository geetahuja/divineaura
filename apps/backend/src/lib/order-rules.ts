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
export function planReturn(lines: PaidLine[], picks: ReturnPick[]) {
  const errors: string[] = []
  const items: { item_id: string; quantity: number; amount: number }[] = []
  for (const p of picks) {
    const l = lines.find((x) => x.id === p.item_id)
    if (!l) { errors.push("Unknown item"); continue }
    if (!l.returnable) { errors.push("This item is not returnable"); continue }
    if (!Number.isInteger(p.quantity) || p.quantity < 1) { errors.push("Choose a quantity"); continue }
    if (p.quantity > l.quantity - l.alreadyReturned) { errors.push("You can't return more than you bought"); continue }
    const unit = l.total / l.quantity
    const amount = round2(Math.min(unit * p.quantity, l.total - l.alreadyRefunded))
    items.push({ item_id: l.id, quantity: p.quantity, amount: Math.max(0, amount) })
  }
  if (!picks.length) errors.push("Choose at least one item")
  return { ok: errors.length === 0, errors, items, refund: round2(items.reduce((a, i) => a + i.amount, 0)) }
}

/** Never refund more than was captured minus earlier refunds. */
export const refundable = (captured: number, refunded: number, wanted: number) => round2(Math.max(0, Math.min(wanted, captured - refunded)))
