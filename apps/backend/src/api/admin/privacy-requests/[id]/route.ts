import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"

// Mark a privacy request done / rejected with a note (what was deleted, what must be kept by law).
export async function POST(req: MedusaRequest<{ status: "open" | "done" | "rejected"; admin_note?: string | null }>, res: MedusaResponse) {
  const { status, admin_note } = req.validatedBody
  const r = await req.scope
    .resolve<ContentModuleService>(CONTENT_MODULE)
    .updatePrivacyRequests({ id: req.params.id, status, admin_note: admin_note ?? null, closed_at: status === "open" ? null : new Date() })
  res.json({ request: r })
}
