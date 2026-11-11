import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEWS_MODULE } from "../../../modules/reviews"
import type ReviewsModuleService from "../../../modules/reviews/service"

// GET /admin/reviews?status=pending&photos=1&rating=5&q=<order number or product title>&offset=0
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, string | undefined>
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = {}
  if (q.status && ["pending", "approved", "rejected", "hidden"].includes(q.status)) filters.status = q.status
  if (q.rating && /^[1-5]$/.test(q.rating)) filters.rating = Number(q.rating)
  const search = (q.q ?? "").trim()
  const titles = new Map<string, string>()
  if (search && /^#?\d+$/.test(search)) filters.order_number = Number(search.replace("#", ""))
  else if (search) {
    const { data } = await query.graph({ entity: "product", fields: ["id", "title"], filters: { title: { $ilike: `%${search}%` } } as never })
    for (const p of data as { id: string; title: string }[]) titles.set(p.id, p.title)
    filters.product_id = [...titles.keys()]
  }

  let rows = await req.scope.resolve<ReviewsModuleService>(REVIEWS_MODULE).listReviews(filters, { order: { created_at: "DESC" }, take: 500 })
  if (q.photos === "1") rows = rows.filter((r) => (r.photos as unknown as string[]).length)
  const missing = [...new Set(rows.map((r) => r.product_id))].filter((id) => !titles.has(id))
  if (missing.length) {
    const { data } = await query.graph({ entity: "product", fields: ["id", "title"], filters: { id: missing } })
    for (const p of data as { id: string; title: string }[]) titles.set(p.id, p.title)
  }
  const offset = Math.max(Number(q.offset) || 0, 0)
  res.json({
    count: rows.length,
    reviews: rows.slice(offset, offset + 50).map(({ ip: _ip, ...r }) => ({ ...r, product_title: titles.get(r.product_id) ?? r.product_id })),
  })
}
