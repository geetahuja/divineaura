import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyPaymentChoice } from "../../../../../lib/payment-choice"
import type { PaymentMethodBody } from "../../../../validators"

// Prices the cart for the chosen payment method (COD fee or prepaid discount).
// The storefront then starts the payment session on the updated total.
export async function POST(req: MedusaRequest<PaymentMethodBody>, res: MedusaResponse) {
  await applyPaymentChoice(req.scope, req.params.id, req.validatedBody.method)
  res.json({ method: req.validatedBody.method })
}
