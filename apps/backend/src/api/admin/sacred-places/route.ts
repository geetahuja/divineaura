import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SACRED_PLACES_MODULE } from "../../../modules/sacred-places"
import SacredPlacesModuleService from "../../../modules/sacred-places/service"
import { createSacredPlaceWorkflow } from "../../../workflows/sacred-places"
import type { CreateSacredPlaceBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service: SacredPlacesModuleService = req.scope.resolve(SACRED_PLACES_MODULE)
  const sacred_places = await service.listSacredPlaces(
    {},
    { order: { rank: "ASC", created_at: "ASC" } }
  )
  res.json({ sacred_places })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateSacredPlaceBody>,
  res: MedusaResponse
) {
  const service: SacredPlacesModuleService = req.scope.resolve(SACRED_PLACES_MODULE)
  // New entries go to the end unless a rank is given.
  const rank =
    req.validatedBody.rank ?? (await service.listSacredPlaces({}, { select: ["id"] })).length
  const { result } = await createSacredPlaceWorkflow(req.scope).run({
    input: { ...req.validatedBody, rank },
  })
  res.json({ sacred_place: result })
}
