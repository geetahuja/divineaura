import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"

const svc = (c: { resolve: <T>(k: string) => T }) => c.resolve<MessagingModuleService>(MESSAGING_MODULE)
type Previous = { created?: string; resubscribed?: { id: string; unsubscribed_at: Date | null; consent_text: string; consented_at: Date } }

// New email → subscribe; unsubscribed email → resubscribe with fresh consent; subscribed → nothing.
const subscribeNewsletterStep = createStep(
  "subscribe-newsletter",
  async ({ email, consent_text }: { email: string; consent_text: string }, { container }) => {
    const [existing] = await svc(container).listNewsletterSubscribers({ email })
    if (!existing) {
      const row = await svc(container).createNewsletterSubscribers({ email, consent_text, consented_at: new Date() })
      return new StepResponse(true, { created: row.id } as Previous)
    }
    if (!existing.unsubscribed_at) return new StepResponse(true, {} as Previous)
    const { id, unsubscribed_at, consented_at } = existing
    await svc(container).updateNewsletterSubscribers({ id, unsubscribed_at: null, consent_text, consented_at: new Date() })
    return new StepResponse(true, { resubscribed: { id, unsubscribed_at, consent_text: existing.consent_text, consented_at } } as Previous)
  },
  async (prev, { container }) => {
    if (prev?.created) await svc(container).deleteNewsletterSubscribers(prev.created)
    if (prev?.resubscribed) await svc(container).updateNewsletterSubscribers(prev.resubscribed)
  }
)

export const subscribeNewsletterWorkflow = createWorkflow(
  "subscribe-newsletter",
  (input: { email: string; consent_text: string }) => new WorkflowResponse(subscribeNewsletterStep(input))
)
