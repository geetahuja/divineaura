import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RETURNS_MODULE } from "../../../modules/returns"
import type ReturnsModuleService from "../../../modules/returns/service"

// GET /admin/returns?status=requested — newest first. Payout details only on the detail route.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = req.query.status as string | undefined
  const rows = await req.scope
    .resolve<ReturnsModuleService>(RETURNS_MODULE)
    .listReturnRequests(status ? { status: status as never } : {}, { order: { created_at: "DESC" }, take: 100 })
  res.json({ returns: rows.map(({ payout_encrypted: _p, ...r }) => ({ ...r, refund_amount: Number(r.refund_amount) })) })
}
