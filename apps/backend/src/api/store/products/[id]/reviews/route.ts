import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { productReviews, Sort } from "../../../../../lib/reviews"

// Public: approved reviews only. ?sort=newest|highest|lowest|photos&offset=0&limit=5
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, string | undefined>
  const sort = (["newest", "highest", "lowest", "photos"] as const).find((s) => s === q.sort) ?? "newest"
  const limit = Math.min(Math.max(Number(q.limit) || 5, 1), 20)
  const offset = Math.max(Number(q.offset) || 0, 0)
  res.json(await productReviews(req.scope, req.params.id, sort as Sort, offset, limit))
}
