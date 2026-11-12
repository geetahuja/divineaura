import { AbstractPaymentProvider, MedusaError, PaymentActions } from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { orderPaymentState, parseWebhook, RazorpayClient, toPaise, verifySignature } from "../../lib/razorpay"

type Options = { key_id: string; key_secret: string; webhook_secret: string }
type Data = { razorpay_order_id?: string; razorpay_payment_id?: string; amount_paise?: number; key_id?: string; session_id?: string; captured?: boolean }

/**
 * Razorpay (UPI, cards, net banking, wallets) — ARCHITECTURE.md §5.7, §9.
 * Registered only when RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + RAZORPAY_WEBHOOK_SECRET
 * are set (medusa-config.ts). Flow:
 *  1. initiatePayment creates a Razorpay order (notes.session_id set HERE, server side)
 *     and returns the public key_id so the storefront needs no build-time env.
 *  2. The browser pays in Razorpay Checkout, then goes to /api/payment-return →
 *     cart completion → authorizePayment asks Razorpay (never trusts the browser).
 *  3. Paid = only the verified "order.paid" webhook (signature + amount + our notes).
 *     Medusa's webhook workflow is idempotent and also completes the cart if the
 *     customer never came back.
 */
class RazorpayPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "razorpay"
  private client: RazorpayClient
  private logger: Logger

  static validateOptions(o: Record<string, unknown>) {
    for (const k of ["key_id", "key_secret", "webhook_secret"]) {
      if (!o?.[k]) throw new MedusaError(MedusaError.Types.INVALID_DATA, `razorpay: ${k} is required`)
    }
  }

  constructor(cradle: { logger: Logger }, options: Options) {
    super(cradle, options)
    this.logger = cradle.logger
    this.client = new RazorpayClient({ keyId: options.key_id, keySecret: options.key_secret, webhookSecret: options.webhook_secret })
  }

  private d(data?: Record<string, unknown>): Data {
    return (data ?? {}) as Data
  }

  private async newOrder(amount: InitiatePaymentInput["amount"], sessionId: string) {
    const paise = toPaise(amount as number)
    const order = await this.client.createOrder(paise, sessionId, { session_id: sessionId })
    return { razorpay_order_id: order.id, amount_paise: paise, key_id: this.config.key_id, session_id: sessionId }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    if (String(input.currency_code).toLowerCase() !== "inr") throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: INR only")
    const sessionId = String((input.data as Data | undefined)?.session_id ?? "")
    const data = await this.newOrder(input.amount, sessionId)
    return { id: data.razorpay_order_id, data }
  }

  // Razorpay orders are immutable: a changed amount needs a new order.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const cur = this.d(input.data)
    if (cur.razorpay_order_id && cur.amount_paise === toPaise(input.amount as number)) return { data: input.data }
    return { data: { ...input.data, ...(await this.newOrder(input.amount, String(cur.session_id ?? ""))) } }
  }

  private async state(data: Data): Promise<{ status: PaymentSessionStatus; paymentId?: string }> {
    if (!data.razorpay_order_id) return { status: "pending" }
    const s = orderPaymentState(await this.client.orderPayments(data.razorpay_order_id))
    const status: PaymentSessionStatus = s.state === "paid" ? (data.captured ? "captured" : "authorized") : s.state === "authorized" ? "authorized" : s.state === "failed" ? "error" : "pending"
    return { status, paymentId: s.payment?.id }
  }

  // Cart completion: an order is created only if Razorpay has the money (authorized or captured).
  // The order is marked Paid later, by the verified webhook (capture).
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = this.d(input.data)
    const s = await this.state(data)
    return { status: s.status === "captured" ? "authorized" : s.status, data: { ...input.data, ...(s.paymentId ? { razorpay_payment_id: s.paymentId } : {}) } }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = this.d(input.data)
    if (!data.razorpay_order_id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Razorpay: no order on this payment")
    const s = orderPaymentState(await this.client.orderPayments(data.razorpay_order_id))
    if (s.state === "authorized" && s.payment) await this.client.capture(s.payment.id, s.payment.amount) // accounts without auto-capture
    else if (s.state !== "paid") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Razorpay has not received this payment")
    return { data: { ...input.data, razorpay_payment_id: s.payment?.id, captured: true } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = this.d(input.data)
    let paymentId = data.razorpay_payment_id
    if (!paymentId && data.razorpay_order_id) paymentId = orderPaymentState(await this.client.orderPayments(data.razorpay_order_id)).payment?.id
    if (!paymentId) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Razorpay: no captured payment to refund")
    const r = await this.client.refund(paymentId, toPaise(input.amount as number), { session_id: String(data.session_id ?? "") })
    return { data: { ...input.data, last_refund_id: r.id } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: (await this.state(this.d(input.data))).status, data: input.data }
  }
  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const id = this.d(input.data).razorpay_order_id
    return { data: { ...input.data, ...(id ? { order: await this.client.getOrder(id) } : {}) } }
  }
  // Unpaid Razorpay orders simply expire; nothing to cancel remotely.
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const raw = typeof payload.rawData === "string" ? payload.rawData : payload.rawData?.toString("utf8") ?? ""
    if (!verifySignature(this.config.webhook_secret, raw, String(payload.headers["x-razorpay-signature"] ?? ""))) {
      this.logger.warn("razorpay: rejected webhook with an invalid signature")
      return { action: PaymentActions.NOT_SUPPORTED }
    }
    const ev = parseWebhook(payload.data)
    if (ev.kind === "ignore") return { action: PaymentActions.NOT_SUPPORTED }
    return { action: PaymentActions.SUCCESSFUL, data: { session_id: ev.sessionId, amount: ev.amount } }
  }
}

export default RazorpayPaymentProviderService
