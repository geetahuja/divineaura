import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createReview } from "../../../../../lib/reviews"
import type { CreateReviewBody } from "../../../../validators"

// Verified buyer writes a review → pending until approved in admin.
export async function POST(req: AuthenticatedMedusaRequest<CreateReviewBody>, res: MedusaResponse) {
  const { order_id, item_id, ...input } = req.validatedBody
  const r = await createReview(req.scope, req.auth_context.actor_id, order_id, item_id, input, req.ip ?? null)
  res.json({ review: { id: r.id, status: r.status } })
}
