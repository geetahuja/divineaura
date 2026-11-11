import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../modules/content"
import type ContentModuleService from "../../../modules/content/service"

// GET /admin/privacy-requests?status=open
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = (req.query as { status?: string }).status
  const rows = await req.scope
    .resolve<ContentModuleService>(CONTENT_MODULE)
    .listPrivacyRequests(status && ["open", "done", "rejected"].includes(status) ? { status: status as "open" } : {}, { order: { created_at: "DESC" }, take: 200 })
  res.json({ requests: rows.map(({ ip: _ip, ...r }) => r) })
}
