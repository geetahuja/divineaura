import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { decryptPayout } from "../../../../lib/order-actions"
import { RETURNS_MODULE } from "../../../../modules/returns"
import type ReturnsModuleService from "../../../../modules/returns/service"

// One return with the customer's payout details (COD refunds) — admin only, until marked paid.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [r] = await req.scope.resolve<ReturnsModuleService>(RETURNS_MODULE).listReturnRequests({ id: req.params.id })
  if (!r) return res.status(404).json({ message: "Return not found" })
  const { payout_encrypted, ...rest } = r
  let payout: unknown = null
  try {
    payout = payout_encrypted ? decryptPayout(payout_encrypted) : null
  } catch {
    payout = { error: "Could not decrypt (PAYOUT_ENCRYPTION_KEY changed?)" }
  }
  res.json({ return: { ...rest, refund_amount: Number(r.refund_amount), payout } })
}
