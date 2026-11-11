import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markPacked } from "../../../../../../lib/shipments"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ changed: await markPacked(req.scope, req.params.id) })
}
