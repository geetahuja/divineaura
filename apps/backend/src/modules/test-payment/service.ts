import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"
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

export const TEST_PAYMENT_SIGNATURE_HEADER = "x-test-payment-signature"

type Options = { webhook_secret: string }
// What the fake gateway knows about a payment, kept in the payment session's data.
// "gateway_status" is only ever written by the backend simulate route, never by
// the storefront (initiatePayment ignores client-supplied data).
type GatewayData = { ref: string; gateway_status: "created" | "paid" | "failed"; captured?: boolean }

export const signTestPayment = (secret: string, rawBody: string) =>
  createHmac("sha256", secret).update(rawBody).digest("hex")

/**
 * DEVELOPMENT-ONLY payment provider that stands in for Razorpay/Cashfree.
 * Same lifecycle as a real gateway: the customer "pays" on a simulator page,
 * the gateway sends an HMAC-signed webhook, and Medusa's webhook workflow
 * captures the payment (= order Paid). Never registered in production.
 */
class TestPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "test-payment"

  // ponytail: in-memory duplicate-event guard; resets on restart. Medusa's
  // webhook workflow is idempotent anyway (cart lock + "already completed").
  private seenEvents = new Set<string>()
  private logger: Logger

  constructor(cradle: { logger: Logger }, options: Options) {
    super(cradle, options)
    this.logger = cradle.logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The test payment provider must not run in production")
    }
    if (!options?.webhook_secret) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "test-payment: webhook_secret is required")
    }
  }

  private gateway(data: Record<string, unknown> | undefined): GatewayData {
    return { ref: String(data?.ref ?? ""), gateway_status: (data?.gateway_status as GatewayData["gateway_status"]) ?? "created", captured: !!data?.captured }
  }

  private status(data: GatewayData): PaymentSessionStatus {
    if (data.gateway_status === "failed") return "error"
    if (data.gateway_status === "paid") return data.captured ? "captured" : "authorized"
    return "pending"
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    // Deliberately ignores input.data: the browser must not be able to pre-set a status.
    const ref = `testpay_${randomUUID()}`
    return { id: ref, data: { ref, gateway_status: "created", amount: input.amount, currency_code: input.currency_code } }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: { ...input.data, amount: input.amount, currency_code: input.currency_code } }
  }

  // Called when the cart is completed: succeeds only if the gateway recorded a payment.
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = this.gateway(input.data)
    return { status: this.status(data), data: input.data }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: { ...input.data, captured: true } }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: this.status(this.gateway(input.data)), data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: { ...input.data, refunded_amount: input.amount } }
  }

  /**
   * Verifies the HMAC signature over the raw body (like Razorpay's
   * X-Razorpay-Signature) and maps the event to a Medusa payment action.
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    const raw = typeof payload.rawData === "string" ? payload.rawData : payload.rawData?.toString("utf8") ?? ""
    const given = String(payload.headers[TEST_PAYMENT_SIGNATURE_HEADER] ?? "")
    const expected = signTestPayment(this.config.webhook_secret, raw)
    const valid =
      given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
    if (!valid) {
      this.logger.warn("test-payment: rejected webhook with an invalid signature")
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const { event_id, event, session_id, amount } = payload.data as {
      event_id: string
      event: string
      session_id: string
      amount: number
    }
    if (this.seenEvents.has(event_id)) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }
    this.seenEvents.add(event_id)

    switch (event) {
      case "payment.captured":
        return { action: PaymentActions.SUCCESSFUL, data: { session_id, amount } }
      case "payment.failed":
        return { action: PaymentActions.FAILED, data: { session_id, amount } }
      default:
        return { action: PaymentActions.NOT_SUPPORTED }
    }
  }
}

export default TestPaymentProviderService
