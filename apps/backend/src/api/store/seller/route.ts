import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sellerDetails } from "../../../lib/content"

// Public seller + grievance officer details for the footer and Contact (E-Commerce Rules 2020).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ seller: await sellerDetails(req.scope) })
}
