import type { MedusaContainer } from "@medusajs/framework/types"
import { brandVars } from "./content"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"
import { OTP_MODULE } from "../modules/otp"
import type OtpModuleService from "../modules/otp/service"
import { createTicket, entityIdFor, generateCode, hashCode, OTP_RULES, requestDecision, verifyDecision } from "./otp"

/**
 * Mobile OTP login (ARCHITECTURE.md §11), email as fallback. Codes are stored
 * hashed, single-use, 5-minute; limits in src/lib/otp.ts. A verified code
 * returns a ticket for the "phone-otp" auth provider (Medusa session).
 */
export type OtpTarget = { phone?: string; email?: string }

const secret = () => {
  const s = process.env.OTP_SECRET
  if (!s) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "OTP_SECRET is not set")
  return s
}
const otp = (c: MedusaContainer) => c.resolve<OtpModuleService>(OTP_MODULE)
const hourAgo = () => new Date(Date.now() - 3600_000)

async function activeChallenge(c: MedusaContainer, identifier: string) {
  const [latest] = await otp(c).listOtpChallenges({ identifier, consumed_at: null }, { order: { created_at: "DESC" }, take: 1 })
  return latest && new Date(latest.expires_at).getTime() > Date.now() ? latest : undefined
}
const sentSince = async (c: MedusaContainer, filter: Record<string, unknown>) =>
  (await otp(c).listOtpChallenges({ ...filter, last_sent_at: { $gte: hourAgo() } }, { select: ["sends"] })).reduce((n, r) => n + r.sends, 0)

export async function requestOtp(c: MedusaContainer, target: OtpTarget, ip: string | null, resend: boolean) {
  const identifier = entityIdFor(target)
  const active = resend ? await activeChallenge(c, identifier) : undefined
  const decision = requestDecision({
    resend: resend && !!active,
    active,
    sentLastHourToIdentifier: await sentSince(c, { identifier }),
    sentLastHourFromIp: ip ? await sentSince(c, { ip }) : 0,
  })
  if (!decision.ok) return decision

  const code = generateCode()
  const now = new Date()
  let sendNumber = 0
  if (active) {
    sendNumber = active.sends // resend → may switch channel (sms_then_whatsapp)
    await otp(c).updateOtpChallenges({ id: active.id, code_hash: hashCode(secret(), identifier, code), sends: active.sends + 1, last_sent_at: now, expires_at: new Date(now.getTime() + OTP_RULES.ttlMs) })
  } else {
    // A new request replaces any earlier unused code for this number.
    const open = await otp(c).listOtpChallenges({ identifier, consumed_at: null }, { select: ["id"] })
    if (open.length) await otp(c).updateOtpChallenges(open.map((o) => ({ id: o.id, consumed_at: now })))
    await otp(c).createOtpChallenges({ identifier, code_hash: hashCode(secret(), identifier, code), expires_at: new Date(now.getTime() + OTP_RULES.ttlMs), last_sent_at: now, ip })
  }
  const sent = await c.resolve<MessagingModuleService>(MESSAGING_MODULE).sendOtp(target as { phone: string }, code, sendNumber, await brandVars(c))
  return { ok: true as const, channel: sent.channel, resendAfterSeconds: OTP_RULES.resendAfterMs / 1000, expiresInSeconds: OTP_RULES.ttlMs / 1000 }
}

export async function verifyOtp(c: MedusaContainer, target: OtpTarget, code: string) {
  const identifier = entityIdFor(target)
  const [latest] = await otp(c).listOtpChallenges({ identifier }, { order: { created_at: "DESC" }, take: 1 })
  const result = verifyDecision(secret(), identifier, code.trim(), latest)
  if (!result.ok) {
    if (result.reason === "wrong") await otp(c).updateOtpChallenges({ id: latest!.id, attempts: latest!.attempts + 1 })
    return result
  }
  // Single use: only the first verify of this code wins.
  const claimed = await c.resolve(Modules.LOCKING).execute(`otp:${latest!.id}`, async () => {
    const [fresh] = await otp(c).listOtpChallenges({ id: latest!.id })
    if (fresh.consumed_at) return false
    await otp(c).updateOtpChallenges({ id: fresh.id, consumed_at: new Date() })
    return true
  })
  if (!claimed) return { ok: false as const, reason: "used" as const }

  const customerId = await ensureCustomer(c, target, identifier)
  await linkGuestOrders(c, target, customerId)
  return { ok: true as const, ticket: createTicket(secret(), identifier) }
}

/** Finds or creates the customer + "phone-otp" auth identity. New numbers get an account. */
async function ensureCustomer(c: MedusaContainer, target: OtpTarget, entityId: string) {
  const auth = c.resolve(Modules.AUTH)
  const customers = c.resolve(Modules.CUSTOMER)
  const [pid] = await auth.listProviderIdentities({ provider: "phone-otp", entity_id: entityId }, { relations: ["auth_identity"] })
  const linked = (pid?.auth_identity?.app_metadata as { customer_id?: string } | undefined)?.customer_id
  if (linked) return linked

  const filter = target.phone ? { phone: target.phone } : { email: target.email!.toLowerCase() }
  const found = await customers.listCustomers(filter, { order: { has_account: "DESC", created_at: "ASC" }, take: 1 })
  const customer = found[0]
    ? found[0].has_account
      ? found[0]
      : await customers.updateCustomers(found[0].id, { has_account: true } as never)
    : await customers.createCustomers({ ...filter, has_account: true, metadata: { signup: "otp" } })

  if (pid?.auth_identity) {
    await auth.updateAuthIdentities({ id: pid.auth_identity.id, app_metadata: { ...(pid.auth_identity.app_metadata ?? {}), customer_id: customer.id } })
  } else {
    await auth.createAuthIdentities({ provider_identities: [{ provider: "phone-otp", entity_id: entityId }], app_metadata: { customer_id: customer.id } })
  }
  return customer.id
}

/**
 * Past guest orders placed with this mobile (or email) join the account.
 * ponytail: scans orders by contact; add an index / filter when order volume grows.
 */
async function linkGuestOrders(c: MedusaContainer, target: OtpTarget, customerId: string) {
  const { data } = await c.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "email", "customer_id", "customer.has_account", "shipping_address.phone"],
  })
  const last10 = (p?: string | null) => (p ?? "").replace(/\D/g, "").slice(-10)
  const mine = data.filter((o) => {
    const match = target.phone ? last10(o.shipping_address?.phone) === last10(target.phone) : o.email?.toLowerCase() === target.email!.toLowerCase()
    return match && o.customer_id !== customerId && !o.customer?.has_account
  })
  if (mine.length) await c.resolve(Modules.ORDER).updateOrders(mine.map((o) => ({ id: o.id, customer_id: customerId })))
}
