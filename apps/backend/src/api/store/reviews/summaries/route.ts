import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ratingSummaries } from "../../../../lib/reviews"

// Public: { summaries: { [product_id]: { count, average } } } from approved reviews (product cards).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ summaries: await ratingSummaries(req.scope) })
}
