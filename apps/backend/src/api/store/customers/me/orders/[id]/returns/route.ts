import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createReturnRequest } from "../../../../../../../lib/order-actions"
import type { ReturnRequestBody } from "../../../../../../validators"

// Return request after delivery, within the return window (rules in lib/order-rules.ts).
export async function POST(req: AuthenticatedMedusaRequest<ReturnRequestBody>, res: MedusaResponse) {
  const b = req.validatedBody
  const r = await createReturnRequest(req.scope, {
    orderId: req.params.id,
    customerId: req.auth_context.actor_id,
    items: b.items,
    reason: b.reason,
    details: b.details,
    photos: b.photos,
    payout: b.payout ?? null,
  })
  res.json({ return: { id: r.id, status: r.status, refund_amount: Number(r.refund_amount), payout_hint: r.payout_hint } })
}
