import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refundUndelivered } from "../../../../../../lib/order-actions"
import type { UndeliveredCause } from "../../../../../../lib/order-rules"

// RTO refund: courier_failed → full; customer_refused / wrong_address → minus shipping.
export async function POST(req: MedusaRequest<{ cause: UndeliveredCause }>, res: MedusaResponse) {
  res.json(await refundUndelivered(req.scope, req.params.id, req.validatedBody.cause))
}
