import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendContactMessage } from "../../../lib/contact"
import type { ContactBody } from "../../validators"

// Contact form → support inbox (+ acknowledgement to the customer's email).
export async function POST(req: MedusaRequest<ContactBody>, res: MedusaResponse) {
  await sendContactMessage(req.scope, req.validatedBody, req.ip ?? null)
  res.json({ sent: true })
}
