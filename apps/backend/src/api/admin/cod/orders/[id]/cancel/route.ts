import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cancelCodOrder } from "../../../../../../lib/cod-orders"
import type { CodCancelBody } from "../../../../../validators"

// Cancels a pending COD order (releases its stock).
export async function POST(req: AuthenticatedMedusaRequest<CodCancelBody>, res: MedusaResponse) {
  res.json(await cancelCodOrder(req.scope, req.params.id, req.validatedBody.reason || "cancelled by the seller"))
}
