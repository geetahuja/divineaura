import { createHmac } from "node:crypto"
import { PaymentActions } from "@medusajs/framework/utils"
import { ManualCourier, trackingUrlFor } from "../couriers/manual"
import { splitTax } from "../gst-invoice"
import { insideSupplyArea } from "../gst-scheme"
import { renderInvoicePdf } from "../invoice-pdf"
import type { InvoiceData } from "../invoices"
import { orderPaymentState, parseWebhook, RazorpayClient, toPaise, verifySignature } from "../razorpay"
import { parsePinList } from "../shipping"
import { siteMode, testToolsAllowed } from "../site-mode"
import RazorpayPaymentProviderService from "../../modules/razorpay-payment/service"

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv

describe("SITE_MODE", () => {
  it("live refuses test tools; staging and development allow them; production without a mode is live", () => {
    expect(testToolsAllowed(env({ NODE_ENV: "production", SITE_MODE: "live" }))).toBe(false)
    expect(testToolsAllowed(env({ NODE_ENV: "production", SITE_MODE: "staging" }))).toBe(true)
    expect(testToolsAllowed(env({ NODE_ENV: "development" }))).toBe(true)
    expect(siteMode(env({ NODE_ENV: "production" }))).toBe("live")
    expect(testToolsAllowed(env({ NODE_ENV: "development", SITE_MODE: "live" }))).toBe(false)
  })
})

// ── Razorpay ───────────────────────────────────────────────────────────────
const SECRET = "whsec_test"
const sign = (raw: string) => createHmac("sha256", SECRET).update(raw).digest("hex")
const orderPaid = (over: { orderAmount?: number; payAmount?: number; payOrder?: string; session?: string } = {}) => ({
  event: "order.paid",
  payload: {
    order: { entity: { id: "order_1", amount: over.orderAmount ?? 129900, currency: "INR", status: "paid", notes: over.session === undefined ? { session_id: "payses_1" } : { session_id: over.session } } },
    payment: { entity: { id: "pay_1", status: "captured", amount: over.payAmount ?? 129900, order_id: over.payOrder ?? "order_1" } },
  },
})

describe("razorpay helpers", () => {
  it("converts rupees to paise without float drift", () => {
    expect(toPaise(1299)).toBe(129900)
    expect(toPaise("1299.95")).toBe(129995)
    expect(toPaise(0.1 + 0.2)).toBe(30)
  })
  it("verifies the webhook signature over the raw body", () => {
    const raw = JSON.stringify(orderPaid())
    expect(verifySignature(SECRET, raw, sign(raw))).toBe(true)
    expect(verifySignature(SECRET, raw + " ", sign(raw))).toBe(false)
    expect(verifySignature(SECRET, raw, undefined)).toBe(false)
    expect(verifySignature("", raw, sign(raw))).toBe(false)
  })
  it("only order.paid with matching order + amount + our session note counts", () => {
    expect(parseWebhook(orderPaid())).toEqual({ kind: "paid", sessionId: "payses_1", amount: 1299, paymentId: "pay_1", orderId: "order_1" })
    expect(parseWebhook(orderPaid({ payAmount: 100 })).kind).toBe("ignore")
    expect(parseWebhook(orderPaid({ payOrder: "order_2" })).kind).toBe("ignore")
    expect(parseWebhook(orderPaid({ session: "" })).kind).toBe("ignore")
    expect(parseWebhook({ event: "payment.failed" }).kind).toBe("ignore")
  })
  it("reads the best payment state across attempts", () => {
    const p = (status: string, id = status) => ({ id, status, amount: 100, order_id: "o" }) as never
    expect(orderPaymentState([p("failed"), p("captured")]).state).toBe("paid")
    expect(orderPaymentState([p("failed"), p("authorized")]).state).toBe("authorized")
    expect(orderPaymentState([p("failed")]).state).toBe("failed")
    expect(orderPaymentState([]).state).toBe("pending")
  })
})

describe("razorpay provider (mocked API)", () => {
  type Call = { url: string; method: string; body?: unknown; auth: string }
  const setup = (payments: { id: string; status: string; amount: number }[] = []) => {
    const calls: Call[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, method: String(init.method), body: init.body ? JSON.parse(String(init.body)) : undefined, auth: String((init.headers as Record<string, string>).authorization) })
      if (url.endsWith("/orders")) return new Response(JSON.stringify({ id: "order_new", amount: 129900, currency: "INR", status: "created" }))
      if (url.includes("/payments") && url.includes("/orders/")) return new Response(JSON.stringify({ items: payments.map((p) => ({ ...p, order_id: "order_new" })) }))
      if (url.endsWith("/refund")) return new Response(JSON.stringify({ id: "rfnd_1", amount: 50000, status: "processed" }))
      if (url.endsWith("/capture")) return new Response(JSON.stringify({ id: "pay_1", status: "captured" }))
      return new Response(JSON.stringify({ error: { description: "nope" } }), { status: 400 })
    }) as unknown as typeof fetch
    const svc = new RazorpayPaymentProviderService({ logger: { warn: () => undefined } } as never, { key_id: "rzp_test_k", key_secret: "s", webhook_secret: SECRET })
    ;(svc as unknown as { client: RazorpayClient }).client = new RazorpayClient({ keyId: "rzp_test_k", keySecret: "s", webhookSecret: SECRET }, fake)
    return { svc, calls }
  }

  it("creates a Razorpay order in paise with our session note and returns the public key", async () => {
    const { svc, calls } = setup()
    const out = await svc.initiatePayment({ amount: 1299, currency_code: "inr", data: { session_id: "payses_9", gateway_status: "paid" } } as never)
    expect(out.id).toBe("order_new")
    expect(out.data).toMatchObject({ razorpay_order_id: "order_new", key_id: "rzp_test_k", session_id: "payses_9", amount_paise: 129900 })
    expect(calls[0].body).toEqual({ amount: 129900, currency: "INR", receipt: "payses_9", notes: { session_id: "payses_9" } })
    expect(calls[0].auth).toBe(`Basic ${Buffer.from("rzp_test_k:s").toString("base64")}`)
  })

  it("authorizes only when Razorpay has the money; the browser can't claim it", async () => {
    const data = { razorpay_order_id: "order_new" }
    expect((await setup([]).svc.authorizePayment({ data } as never)).status).toBe("pending")
    expect((await setup([{ id: "pay_x", status: "failed", amount: 1 }]).svc.authorizePayment({ data } as never)).status).toBe("error")
    const ok = await setup([{ id: "pay_1", status: "captured", amount: 129900 }]).svc.authorizePayment({ data } as never)
    expect(ok.status).toBe("authorized") // Paid comes from the webhook capture, not here
    expect(ok.data).toMatchObject({ razorpay_payment_id: "pay_1" })
  })

  it("captures authorized-only payments and refunds in paise", async () => {
    const { svc, calls } = setup([{ id: "pay_1", status: "authorized", amount: 129900 }])
    await svc.capturePayment({ data: { razorpay_order_id: "order_new" } } as never)
    expect(calls.at(-1)).toMatchObject({ method: "POST", body: { amount: 129900, currency: "INR" } })
    expect(calls.at(-1)!.url).toMatch(/\/payments\/pay_1\/capture$/)
    const r = await svc.refundPayment({ amount: 500, data: { razorpay_payment_id: "pay_1", session_id: "payses_9" } } as never)
    expect(calls.at(-1)!.body).toMatchObject({ amount: 50000 })
    expect(r.data).toMatchObject({ last_refund_id: "rfnd_1" })
  })

  it("webhook: valid signature + order.paid → SUCCESSFUL; anything else is ignored", async () => {
    const { svc } = setup()
    const raw = JSON.stringify(orderPaid())
    const ok = await svc.getWebhookActionAndData({ data: JSON.parse(raw), rawData: Buffer.from(raw), headers: { "x-razorpay-signature": sign(raw) } })
    expect(ok).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_1", amount: 1299 } })
    const forged = await svc.getWebhookActionAndData({ data: JSON.parse(raw), rawData: Buffer.from(raw), headers: { "x-razorpay-signature": "0".repeat(64) } })
    expect(forged.action).toBe(PaymentActions.NOT_SUPPORTED)
  })

  it("refuses to load without its keys", () => {
    expect(() => RazorpayPaymentProviderService.validateOptions({ key_id: "k", key_secret: "s" })).toThrow(/webhook_secret/)
  })
})

// ── Manual courier + PIN lists ─────────────────────────────────────────────
describe("manual courier", () => {
  const settings = { manual_courier_name: "DTDC", manual_tracking_url: "https://track.example/?awb={awb}", manual_eta_min: 2, manual_eta_max: 5 }
  const list: Record<string, { cod: boolean }> = { "110001": { cod: true }, "400001": { cod: false } }
  const courier = new ManualCourier({ pincode: async (p) => list[p] ?? null, settings: async () => settings })

  it("serves only listed PIN codes; COD per PIN", async () => {
    expect(await courier.serviceability({ deliveryPin: "110001" } as never)).toMatchObject({ serviceable: true, cod: true, etaDays: { min: 2, max: 5 } })
    expect(await courier.serviceability({ deliveryPin: "400001" } as never)).toMatchObject({ serviceable: true, cod: false })
    expect((await courier.serviceability({ deliveryPin: "560001" } as never)).serviceable).toBe(false)
  })
  it("uses the admin's AWB; tracking link from the template unless typed in", async () => {
    const base = { manual: { awb: " AB 123 " } } as never
    expect(await courier.createShipment(base)).toMatchObject({ awb: "AB 123", courierName: "DTDC", trackingUrl: "https://track.example/?awb=AB%20123" })
    expect(await courier.createShipment({ manual: { awb: "X1", courierName: "Blue Dart", trackingUrl: "https://bd.example/X1" } } as never)).toMatchObject({ courierName: "Blue Dart", trackingUrl: "https://bd.example/X1" })
    await expect(courier.createShipment({ manual: { awb: "" } } as never)).rejects.toThrow(/AWB/)
    await expect(courier.createShipment({ manual: { awb: "X", trackingUrl: "javascript:alert(1)" } } as never)).rejects.toThrow(/https/)
    expect(trackingUrlFor("ftp://x/{awb}", "1")).toBeNull()
  })
  it("never accepts webhooks", () => {
    expect(courier.verifyWebhook()).toBe(false)
  })
  it("parses bulk-pasted PIN codes with any separators", () => {
    expect(parsePinList("110001\n400001, 400001;560001\t 012345 abc")).toEqual({ valid: ["110001", "400001", "560001"], invalid: ["012345", "abc"] })
  })
})

// ── GST composition scheme ─────────────────────────────────────────────────
describe("GST composition scheme", () => {
  it("regular delivers everywhere", () => {
    expect(insideSupplyArea("regular", "Maharashtra", { pincode: "110001" })).toBe(true)
  })
  it("composition delivers only inside the seller's state", () => {
    expect(insideSupplyArea("composition", "Maharashtra", { pincode: "400001" })).toBe(true)
    expect(insideSupplyArea("composition", "Maharashtra", { pincode: "110001" })).toBe(false)
    expect(insideSupplyArea("composition", "Maharashtra", { pincode: "400001", addressState: "Gujarat" })).toBe(false)
    expect(insideSupplyArea("composition", "Maharashtra", { pincode: "403001", pinState: "Goa" })).toBe(false) // courier lookup wins
    expect(insideSupplyArea("composition", "Maharashtra", { pincode: null })).toBe(false)
    expect(insideSupplyArea("composition", "Nowhere", { pincode: "400001" })).toBe(false)
  })
  it("renders a Bill of Supply without tax columns", () => {
    const { lines, totals } = splitTax([{ kind: "goods", description: "Locket", hsn: "7117", quantity: 1, total: 599, tax: 0, rate: 0 }], true, 599)
    const d = {
      kind: "invoice", number: "BOS/26-27/00001", issued_at: "2026-11-12T10:00:00Z", bill_of_supply: true,
      seller: { legal_name: "X", brand: "DivineAura", name: "X", lines: [], state: "Maharashtra", state_code: "27", gstin: "27ABCDE1234F1Z5" },
      buyer: { name: "A", lines: [], state: "Maharashtra", state_code: "27" },
      order: { number: 1, date: "2026-11-12T10:00:00Z", payment: "Prepaid (online)" },
      place_of_supply: "Maharashtra (27)", intra_state: true, lines, totals, words: "Rupees Five Hundred Ninety Nine Only",
    } as InvoiceData
    expect(totals).toMatchObject({ cgst: 0, sgst: 0, igst: 0, grandTotal: 599 })
    const pdf = renderInvoicePdf(d).toString("latin1")
    expect(pdf).toContain("BILL OF SUPPLY")
    expect(pdf).toContain("Composition taxable person, not eligible to collect tax on supplies")
    expect(pdf).not.toContain("CGST")
  })
})
