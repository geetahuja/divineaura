import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { rejectReturn } from "../../../../../lib/order-actions"

// Reject with a reason the customer will see.
export async function POST(req: MedusaRequest<{ note: string }>, res: MedusaResponse) {
  res.json({ return: await rejectReturn(req.scope, req.params.id, req.validatedBody.note) })
}
