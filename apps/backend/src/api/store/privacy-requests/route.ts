import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createPrivacyRequest } from "../../../lib/contact"
import type { PrivacyRequestBody } from "../../validators"

// DPDP: "delete / access / correct my data" → admin task (Admin → Privacy requests) + emails.
export async function POST(req: MedusaRequest<PrivacyRequestBody>, res: MedusaResponse) {
  const r = await createPrivacyRequest(req.scope, req.validatedBody, req.ip ?? null)
  res.json({ request: { id: r.id, status: r.status } })
}
