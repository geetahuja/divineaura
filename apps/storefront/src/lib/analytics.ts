// E-commerce analytics (GA4 + Meta Pixel), ARCHITECTURE.md §13–14.
// - Scripts load only when the env ID is set AND the visitor consented (see Analytics component).
// - Only product/order facts are sent: never phone, email, name or address.

export type AnalyticsItem = { item_id: string; item_name: string; price: number; quantity: number; item_variant?: string; item_category?: string }
export type EcommerceEvent =
  | { name: "view_item"; value: number; items: AnalyticsItem[] }
  | { name: "add_to_cart"; value: number; items: AnalyticsItem[] }
  | { name: "begin_checkout"; value: number; items: AnalyticsItem[] }
  | { name: "add_payment_info"; value: number; payment_type: "online" | "cod"; items: AnalyticsItem[] }
  | { name: "purchase"; value: number; transaction_id: string; shipping?: number; tax?: number; items: AnalyticsItem[] }

const META_NAME: Record<EcommerceEvent["name"], string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
}

const r2 = (n: number) => Math.round(Number(n) * 100) / 100
// Whitelist: anything not listed here (emails, phones, addresses…) is dropped.
const cleanItem = (i: AnalyticsItem) => ({
  item_id: String(i.item_id),
  item_name: String(i.item_name).slice(0, 100),
  price: r2(i.price),
  quantity: Math.max(1, Math.round(i.quantity)),
  ...(i.item_variant ? { item_variant: String(i.item_variant).slice(0, 100) } : {}),
  ...(i.item_category ? { item_category: String(i.item_category).slice(0, 100) } : {}),
})

/** GA4 event params (currency INR, whitelisted fields only). */
export function toGa4(e: EcommerceEvent) {
  return {
    currency: "INR",
    value: r2(e.value),
    items: e.items.map(cleanItem),
    ...(e.name === "purchase" ? { transaction_id: String(e.transaction_id), ...(e.shipping != null ? { shipping: r2(e.shipping) } : {}), ...(e.tax != null ? { tax: r2(e.tax) } : {}) } : {}),
    ...(e.name === "add_payment_info" ? { payment_type: e.payment_type } : {}),
  }
}

/** Meta Pixel standard event + params. */
export function toMeta(e: EcommerceEvent) {
  return {
    name: META_NAME[e.name],
    params: {
      currency: "INR",
      value: r2(e.value),
      content_type: "product",
      content_ids: e.items.map((i) => String(i.item_id)),
      contents: e.items.map((i) => ({ id: String(i.item_id), quantity: Math.max(1, Math.round(i.quantity)) })),
      num_items: e.items.reduce((n, i) => n + Math.max(1, Math.round(i.quantity)), 0),
    },
  }
}

type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void }

/** Sends to whichever tools are loaded (nothing loads without consent). Safe to call anywhere. */
export function track(e: EcommerceEvent) {
  if (typeof window === "undefined") return
  const w = window as W
  try {
    w.gtag?.("event", e.name, toGa4(e))
    const m = toMeta(e)
    w.fbq?.("track", m.name, m.params, e.name === "purchase" ? { eventID: `order-${e.transaction_id}` } : undefined)
  } catch {
    // analytics must never break the shop
  }
}

/** purchase fires once per order (reloading the confirmation page doesn't count twice). */
export function trackPurchaseOnce(e: Extract<EcommerceEvent, { name: "purchase" }>) {
  try {
    const key = `da_purchase_${e.transaction_id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, "1")
  } catch {}
  track(e)
}
