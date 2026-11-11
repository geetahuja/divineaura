import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { moderate, reply } from "../../../../../lib/reviews"

/**
 * POST /admin/reviews/:id/approve | reject | hide   { reason? }  (reason is admin-only)
 * POST /admin/reviews/:id/reply                     { reply }    (public, empty = remove)
 * Moderation changes status and reply only — never the customer's text or rating.
 */
export async function POST(req: MedusaRequest<{ reason?: string | null; reply?: string | null }>, res: MedusaResponse) {
  const { id, action } = req.params
  if (action === "reply") return res.json({ review: await reply(req.scope, id, req.validatedBody.reply ?? null) })
  if (action !== "approve" && action !== "reject" && action !== "hide") throw new MedusaError(MedusaError.Types.NOT_FOUND, "Unknown action")
  res.json({ review: await moderate(req.scope, id, action, req.validatedBody.reason) })
}
