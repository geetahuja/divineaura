import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteSacredPlaceWorkflow,
  updateSacredPlacesWorkflow,
} from "../../../../workflows/sacred-places"
import type { UpdateSacredPlaceBody } from "../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateSacredPlaceBody>,
  res: MedusaResponse
) {
  const { result } = await updateSacredPlacesWorkflow(req.scope).run({
    input: [{ id: req.params.id, ...req.validatedBody }],
  })
  res.json({ sacred_place: result[0] })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await deleteSacredPlaceWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "sacred_place", deleted: true })
}
