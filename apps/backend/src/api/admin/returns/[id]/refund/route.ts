import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refundReturn } from "../../../../../lib/order-actions"

// Prepaid: retry the provider refund. COD: "refund paid" after paying the customer's UPI / bank account.
export async function POST(req: MedusaRequest<{ reference?: string | null }>, res: MedusaResponse) {
  res.json({ return: await refundReturn(req.scope, req.params.id, req.validatedBody.reference) })
}
