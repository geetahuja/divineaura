// Shipping rules (ARCHITECTURE.md §5 rules 4 and 9, §10). Pure functions shared by
// the shipping provider, routes, jobs and tests.
import { COD_FEE_ITEM_TYPE, PREPAID_PROMO_CODE } from "./cod"

// ── Free shipping ──────────────────────────────────────────────────────────
type PricedItem = {
  unit_price: number
  quantity: number
  metadata?: Record<string, unknown> | null
  adjustments?: ({ amount: number; code?: string | null } | null)[] | null
}

/**
 * Product subtotal after coupons, EXCLUDING the COD fee line and the prepaid
 * (online-payment) discount — so choosing COD or online never changes whether
 * shipping is free. Amounts are GST-inclusive rupees.
 */
export function merchandiseSubtotal(items: PricedItem[]) {
  return items
    .filter((i) => i.metadata?.type !== COD_FEE_ITEM_TYPE)
    .reduce((sum, i) => {
      const gross = Number(i.unit_price) * Number(i.quantity)
      const coupons = (i.adjustments ?? [])
        .filter((a) => a && a.code !== PREPAID_PROMO_CODE)
        .reduce((s, a) => s + Number(a!.amount), 0)
      return sum + gross - coupons
    }, 0)
}

export const shippingPrice = (subtotal: number, policy: { rate: number; freeThreshold: number | null }) =>
  policy.freeThreshold !== null && subtotal >= policy.freeThreshold ? 0 : policy.rate

// ── Weight ─────────────────────────────────────────────────────────────────
// Sum of each item's DivineAura weight (weight_g, per unit) × quantity, using a
// default for products with no weight yet, plus packaging. Result in grams.
export function shipmentWeightGrams(
  items: { quantity: number; weight_g?: number | null }[],
  defaults: { itemGrams: number; packagingGrams: number }
) {
  const goods = items.reduce((sum, i) => sum + Number(i.quantity) * (Number(i.weight_g) > 0 ? Number(i.weight_g) : defaults.itemGrams), 0)
  return Math.max(1, Math.round(goods + defaults.packagingGrams))
}

// ── PIN codes ──────────────────────────────────────────────────────────────
export const isValidPin = (pin: string) => /^[1-9]\d{5}$/.test(pin)

// First two digits of an Indian PIN code → postal circle/state. Used when the
// courier can't look up the PIN (test courier); Shiprocket returns city + state.
const PIN_STATE: [number, number, string][] = [
  [11, 11, "Delhi"], [12, 13, "Haryana"], [14, 16, "Punjab"], [17, 17, "Himachal Pradesh"], [18, 19, "Jammu and Kashmir"],
  [20, 28, "Uttar Pradesh"], [30, 34, "Rajasthan"], [36, 39, "Gujarat"], [40, 44, "Maharashtra"], [45, 48, "Madhya Pradesh"],
  [49, 49, "Chhattisgarh"], [50, 50, "Telangana"], [51, 53, "Andhra Pradesh"], [56, 59, "Karnataka"], [60, 64, "Tamil Nadu"],
  [67, 69, "Kerala"], [70, 74, "West Bengal"], [75, 77, "Odisha"], [78, 78, "Assam"], [79, 79, "Arunachal Pradesh"],
  [80, 82, "Bihar"], [83, 83, "Jharkhand"], [84, 85, "Bihar"],
]
export function stateFromPin(pin: string): string | null {
  if (!isValidPin(pin)) return null
  const p = Number(pin.slice(0, 2))
  return PIN_STATE.find(([a, b]) => p >= a && p <= b)?.[2] ?? null
}

// ── Order timeline ─────────────────────────────────────────────────────────
export const TIMELINE = ["placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"] as const
// After-sales steps follow a terminal status: returns after delivery, refunds after a cancellation or return.
export const AFTER_SALES = ["return_requested", "returned", "refunded"] as const
export type TimelineStatus = (typeof TIMELINE)[number] | "rto" | "cancelled" | (typeof AFTER_SALES)[number]
export const TERMINAL: TimelineStatus[] = ["delivered", "rto", "cancelled"]

export const TIMELINE_LABEL: Record<TimelineStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rto: "Returned to us (RTO)",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
}

/**
 * Whether `next` may be added after the statuses already recorded.
 * - each status at most once (webhook retries and the sync job are idempotent)
 * - nothing after a terminal status (delivered / RTO / cancelled)
 * - forward-only along the happy path (a late "shipped" after "out for delivery" is ignored)
 * - cancelled only before shipping; RTO only after shipping
 */
export function canAdvance(recorded: TimelineStatus[], next: TimelineStatus): boolean {
  if (recorded.includes(next)) return false
  if (next === "return_requested") return recorded.includes("delivered")
  if (next === "returned") return recorded.includes("return_requested")
  if (next === "refunded") return recorded.includes("cancelled") || recorded.includes("returned") || recorded.includes("rto")
  if (recorded.some((s) => TERMINAL.includes(s))) return false
  const furthest = Math.max(-1, ...recorded.map((s) => TIMELINE.indexOf(s as (typeof TIMELINE)[number])))
  const shipped = furthest >= TIMELINE.indexOf("shipped")
  if (next === "cancelled") return !shipped
  if (next === "rto") return shipped
  return TIMELINE.indexOf(next) > furthest
}

// Statuses a shipped order passes through before `target` (for courier events
// that skip steps, e.g. "delivered" arriving without "out for delivery").
export function fillGaps(recorded: TimelineStatus[], target: TimelineStatus): TimelineStatus[] {
  const to = TIMELINE.indexOf(target as (typeof TIMELINE)[number])
  if (to < 0) return canAdvance(recorded, target) ? [target] : []
  const steps: TimelineStatus[] = []
  const shippedIdx = TIMELINE.indexOf("shipped")
  for (let i = shippedIdx; i <= to; i++) {
    const s = TIMELINE[i]
    if (canAdvance([...recorded, ...steps], s)) steps.push(s)
  }
  return steps
}
