import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../modules/reviews"
import type ReviewsModuleService from "../../../modules/reviews/service"
import type { ReviewSettingsBody } from "../../validators"
import { updateReviewSettingsWorkflow } from "../../../workflows/settings"

// Admin → Reviews → Settings: request delay, min length, blocked words, coupon incentive (off by default).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ settings: await req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE).getSettings() })
}

export async function POST(req: MedusaRequest<ReviewSettingsBody>, res: MedusaResponse) {
  const { result } = await updateReviewSettingsWorkflow(req.scope).run({ input: req.validatedBody })
  res.json({ settings: result })
}
