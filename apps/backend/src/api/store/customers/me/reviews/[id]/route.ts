import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateReview } from "../../../../../../lib/reviews"
import type { UpdateReviewBody } from "../../../../../validators"

// The author edits their review while it is still pending.
export async function POST(req: AuthenticatedMedusaRequest<UpdateReviewBody>, res: MedusaResponse) {
  const r = await updateReview(req.scope, req.auth_context.actor_id, req.params.id, req.validatedBody)
  res.json({ review: { id: r.id, status: r.status } })
}
