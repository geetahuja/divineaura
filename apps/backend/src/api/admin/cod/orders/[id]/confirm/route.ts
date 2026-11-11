import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmCodOrder } from "../../../../../../lib/cod-orders"

// Confirmed by phone from the COD queue / order page.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await confirmCodOrder(req.scope, req.params.id, "admin"))
}
