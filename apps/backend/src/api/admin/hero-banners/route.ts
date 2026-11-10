import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNERS_MODULE } from "../../../modules/hero-banners"
import HeroBannersModuleService from "../../../modules/hero-banners/service"
import { createHeroBannerWorkflow } from "../../../workflows/hero-banners"
import type { CreateHeroBannerBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service: HeroBannersModuleService = req.scope.resolve(HERO_BANNERS_MODULE)
  const hero_banners = await service.listHeroBanners({}, { order: { priority: "DESC", created_at: "DESC" } })
  res.json({ hero_banners })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateHeroBannerBody>, res: MedusaResponse) {
  const { result } = await createHeroBannerWorkflow(req.scope).run({ input: req.validatedBody })
  res.json({ hero_banner: result })
}
