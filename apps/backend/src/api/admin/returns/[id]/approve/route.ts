import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { approveReturn } from "../../../../../lib/order-actions"

// Approve → reverse pickup booked with the courier, customer messaged.
export async function POST(req: MedusaRequest<{ note?: string | null }>, res: MedusaResponse) {
  res.json({ return: await approveReturn(req.scope, req.params.id, req.validatedBody.note) })
}
