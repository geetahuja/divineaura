import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { receiveReturn } from "../../../../../lib/order-actions"

// Items back at the warehouse. Prepaid orders are refunded right away.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  res.json({ return: await receiveReturn(req.scope, req.params.id) })
}
