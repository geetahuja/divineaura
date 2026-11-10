import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteHeroBannerWorkflow, updateHeroBannerWorkflow } from "../../../../workflows/hero-banners"
import type { UpdateHeroBannerBody } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<UpdateHeroBannerBody>, res: MedusaResponse) {
  const { result } = await updateHeroBannerWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody },
  })
  res.json({ hero_banner: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await deleteHeroBannerWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "hero_banner", deleted: true })
}
