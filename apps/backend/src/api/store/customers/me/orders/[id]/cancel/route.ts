import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { customerCancel } from "../../../../../../../lib/order-actions"

// Customer cancels before packing: stock released, prepaid refunded, COD simply cancelled.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await customerCancel(req.scope, req.params.id, req.auth_context.actor_id))
}
