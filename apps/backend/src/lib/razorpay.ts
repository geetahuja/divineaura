import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Razorpay REST + webhook helpers (pure where possible; unit-tested with a
 * mocked fetch). Docs: https://razorpay.com/docs/api/ — orders, payments,
 * refunds, webhooks (X-Razorpay-Signature = HMAC-SHA256(raw body, webhook secret)).
 * No SDK dependency: three endpoints over fetch.
 */

export type RazorpayConfig = { keyId: string; keySecret: string; webhookSecret: string; apiBase?: string }
export type RzpPayment = { id: string; status: "created" | "authorized" | "captured" | "refunded" | "failed"; amount: number; order_id: string; method?: string }
export type RzpOrder = { id: string; amount: number; currency: string; status: "created" | "attempted" | "paid"; receipt?: string; notes?: Record<string, string> }

/** ₹ (Medusa stores major units, e.g. 1299.5) → paise integer. */
export const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100)
export const fromPaise = (paise: number) => paise / 100

export function verifySignature(secret: string, rawBody: string, given: string | undefined) {
  if (!secret || !given) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

/** Best state across an order's payment attempts: captured > authorized > failed/none. */
export function orderPaymentState(payments: RzpPayment[]): { state: "paid" | "authorized" | "pending" | "failed"; payment: RzpPayment | null } {
  const captured = payments.find((p) => p.status === "captured" || p.status === "refunded")
  if (captured) return { state: "paid", payment: captured }
  const auth = payments.find((p) => p.status === "authorized")
  if (auth) return { state: "authorized", payment: auth }
  if (payments.length && payments.every((p) => p.status === "failed")) return { state: "failed", payment: null }
  return { state: "pending", payment: null }
}

/**
 * Webhook → what Medusa should do. Only "order.paid" moves money state: its
 * order entity carries the notes WE set server-side (session_id), so a browser
 * can't point a payment at someone else's session. The amount must match the
 * Razorpay order exactly.
 */
export function parseWebhook(body: unknown):
  | { kind: "paid"; sessionId: string; amount: number; paymentId: string; orderId: string }
  | { kind: "ignore"; reason: string } {
  const b = body as { event?: string; payload?: { order?: { entity?: RzpOrder }; payment?: { entity?: RzpPayment } } }
  if (b?.event !== "order.paid") return { kind: "ignore", reason: `event ${b?.event ?? "?"}` }
  const order = b.payload?.order?.entity
  const payment = b.payload?.payment?.entity
  const sessionId = order?.notes?.session_id
  if (!order || !payment || !sessionId) return { kind: "ignore", reason: "missing order/payment/session" }
  if (payment.order_id !== order.id || payment.amount !== order.amount) return { kind: "ignore", reason: "amount/order mismatch" }
  return { kind: "paid", sessionId, amount: fromPaise(order.amount), paymentId: payment.id, orderId: order.id }
}

export class RazorpayClient {
  constructor(private cfg: RazorpayConfig, private fetchImpl: typeof fetch = fetch) {}

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const auth = Buffer.from(`${this.cfg.keyId}:${this.cfg.keySecret}`).toString("base64")
    const r = await this.fetchImpl(`${this.cfg.apiBase ?? "https://api.razorpay.com/v1"}${path}`, {
      method,
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = (await r.json().catch(() => ({}))) as T & { error?: { description?: string } }
    if (!r.ok) throw new Error(`Razorpay ${method} ${path} failed (${r.status}): ${json?.error?.description ?? "unknown error"}`)
    return json
  }

  createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
    return this.call<RzpOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes })
  }
  getOrder(id: string) {
    return this.call<RzpOrder>("GET", `/orders/${encodeURIComponent(id)}`)
  }
  async orderPayments(id: string) {
    return (await this.call<{ items: RzpPayment[] }>("GET", `/orders/${encodeURIComponent(id)}/payments`)).items ?? []
  }
  capture(paymentId: string, amountPaise: number) {
    return this.call<RzpPayment>("POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" })
  }
  refund(paymentId: string, amountPaise: number, notes: Record<string, string> = {}) {
    return this.call<{ id: string; amount: number; status: string }>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, notes })
  }
}
