import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { reviewableItems } from "../../../../../../../lib/reviews"

// The order's products: can each be reviewed (delivered, not yet reviewed), plus the customer's own review.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ items: await reviewableItems(req.scope, req.params.id, req.auth_context.actor_id) })
}
