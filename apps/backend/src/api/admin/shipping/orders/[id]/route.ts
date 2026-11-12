import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { shippingOverview } from "../../../../../lib/shipments"

// Admin order panel: shipment (AWB, label), timeline, courier options, COD gate.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await shippingOverview(req.scope, req.params.id, typeof req.query.courier === "string" ? req.query.courier : null))
}
