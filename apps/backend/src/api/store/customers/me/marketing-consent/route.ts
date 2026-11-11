import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { MarketingConsentBody } from "../../../../validators"

// Marketing opt-ins per channel (sms / whatsapp / email). Transactional messages never need these.
async function consentOf(req: AuthenticatedMedusaRequest) {
  const c = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(req.auth_context.actor_id)
  return { customer: c, consent: (c.metadata?.marketing_consent ?? {}) as Record<string, boolean> }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ consent: (await consentOf(req)).consent })
}

export async function POST(req: AuthenticatedMedusaRequest<MarketingConsentBody>, res: MedusaResponse) {
  const { customer, consent } = await consentOf(req)
  const next = { ...consent, ...req.validatedBody, updated_at: new Date().toISOString() }
  await req.scope.resolve(Modules.CUSTOMER).updateCustomers(customer.id, { metadata: { ...(customer.metadata ?? {}), marketing_consent: next } })
  res.json({ consent: next })
}
