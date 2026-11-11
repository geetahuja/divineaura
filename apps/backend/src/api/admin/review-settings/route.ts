import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../modules/reviews"
import type ReviewsModuleService from "../../../modules/reviews/service"
import type { ReviewSettingsBody } from "../../validators"

// Admin → Reviews → Settings: request delay, min length, blocked words, coupon incentive (off by default).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ settings: await req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE).getSettings() })
}

export async function POST(req: MedusaRequest<ReviewSettingsBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE)
  const current = await svc.getSettings()
  res.json({ settings: await svc.updateReviewSettings({ id: current.id, ...req.validatedBody }) })
}
