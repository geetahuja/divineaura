import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateSacredPlacesWorkflow } from "../../../../workflows/sacred-places"
import type { ReorderSacredPlacesBody } from "../../../validators"

// Body: ids in the desired display order.
export async function POST(
  req: AuthenticatedMedusaRequest<ReorderSacredPlacesBody>,
  res: MedusaResponse
) {
  const { result } = await updateSacredPlacesWorkflow(req.scope).run({
    input: req.validatedBody.ids.map((id, rank) => ({ id, rank })),
  })
  res.json({ sacred_places: result })
}
