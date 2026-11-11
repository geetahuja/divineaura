import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { photoReviews } from "../../../../lib/reviews"

// Public: latest approved reviews with photos (homepage "From our devotees").
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ reviews: await photoReviews(req.scope, Math.min(Number((req.query as { limit?: string }).limit) || 8, 20)) })
}
