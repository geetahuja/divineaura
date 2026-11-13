import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { subscribeNewsletterWorkflow } from "../../../workflows/newsletter"
import type { NewsletterBody } from "../../validators"

export const CONSENT_TEXT = "I agree to receive DivineAura emails about new collections and festival offers. I can unsubscribe anytime."

// Footer signup; explicit consent required (validated as consent: true). Same answer for new and existing emails.
export async function POST(req: MedusaRequest<NewsletterBody>, res: MedusaResponse) {
  await subscribeNewsletterWorkflow(req.scope).run({ input: { email: req.validatedBody.email, consent_text: CONSENT_TEXT } })
  res.json({ subscribed: true })
}
