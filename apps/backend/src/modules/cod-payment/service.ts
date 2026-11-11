import { AbstractPaymentProvider, PaymentActions } from "@medusajs/framework/utils"
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
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

/**
 * Cash on Delivery (ARCHITECTURE.md §5.5). No money moves online: authorizing
 * lets the order be created; the payment is captured in admin when the courier
 * collects the cash. Eligibility, the COD fee and "no prepaid discount" are
 * enforced by the complete-cart guard (src/workflows/hooks/complete-cart.ts),
 * not here, because the provider never sees the cart.
 */
class CodPaymentProviderService extends AbstractPaymentProvider<Record<string, never>> {
  static identifier = "cod"

  constructor(cradle: Record<string, unknown>, options: Record<string, never>) {
    super(cradle, options)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return { id: `cod_${Date.now()}`, data: { method: "cod", amount: input.amount, currency_code: input.currency_code } }
  }
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: { ...input.data, amount: input.amount } }
  }
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return { status: "authorized", data: input.data }
  }
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: { ...input.data, collected_at: new Date().toISOString() } }
  }
  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: input.data?.collected_at ? "captured" : "authorized", data: input.data }
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
  async getWebhookActionAndData(): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default CodPaymentProviderService
