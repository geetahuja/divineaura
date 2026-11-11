import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MESSAGING_MODULE } from "../../../modules/messaging"
import type MessagingModuleService from "../../../modules/messaging/service"
import type { NewsletterBody } from "../../validators"

export const CONSENT_TEXT = "I agree to receive DivineAura emails about new collections and festival offers. I can unsubscribe anytime."

// Footer signup; explicit consent required (validated as consent: true). Same answer for new and existing emails.
export async function POST(req: MedusaRequest<NewsletterBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<MessagingModuleService>(MESSAGING_MODULE)
  const { email } = req.validatedBody
  const [existing] = await svc.listNewsletterSubscribers({ email })
  if (!existing) await svc.createNewsletterSubscribers({ email, consent_text: CONSENT_TEXT, consented_at: new Date() })
  else if (existing.unsubscribed_at) await svc.updateNewsletterSubscribers({ id: existing.id, unsubscribed_at: null, consent_text: CONSENT_TEXT, consented_at: new Date() })
  res.json({ subscribed: true })
}
