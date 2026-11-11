import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deliveryCheck } from "../../../lib/shipments"

// PIN-code check for the product page and checkout: serviceable, ETA days, COD
// (courier + blocklist + COD switch), and city/state for auto-fill.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json(await deliveryCheck(req.scope, String(req.query.pincode ?? "").trim()))
}
