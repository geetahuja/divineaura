import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

// Mobile / email OTP login rules (ARCHITECTURE.md §11). Pure, unit-tested.
export const OTP_RULES = {
  digits: 6,
  ttlMs: 5 * 60_000, // code valid 5 minutes
  maxResends: 3, // per code request
  maxWrong: 5, // wrong attempts before the code is locked
  resendAfterMs: 30_000, // resend timer (also the SMS → WhatsApp fallback point)
  perIdentifierPerHour: 10, // sends to one phone/email per hour
  perIpPerHour: 20, // sends from one IP per hour
  ticketTtlMs: 60_000, // login ticket handed to the auth provider
}

export const generateCode = () => String(randomInt(0, 10 ** OTP_RULES.digits)).padStart(OTP_RULES.digits, "0")

// The code is never stored: only HMAC(secret, identifier:code).
export const hashCode = (secret: string, identifier: string, code: string) =>
  createHmac("sha256", secret).update(`${identifier}:${code}`).digest("hex")

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export type Challenge = { code_hash: string; expires_at: Date | string; attempts: number; sends: number; consumed_at: Date | string | null; last_sent_at: Date | string }

export type VerifyResult = { ok: true } | { ok: false; reason: "expired" | "locked" | "used" | "wrong"; attemptsLeft?: number }

export function verifyDecision(secret: string, identifier: string, code: string, c: Challenge | undefined, now = new Date()): VerifyResult {
  if (!c) return { ok: false, reason: "expired" }
  if (c.consumed_at) return { ok: false, reason: "used" }
  if (c.attempts >= OTP_RULES.maxWrong) return { ok: false, reason: "locked" }
  if (new Date(c.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "expired" }
  if (!/^\d{6}$/.test(code) || !safeEqual(hashCode(secret, identifier, code), c.code_hash)) {
    return { ok: false, reason: "wrong", attemptsLeft: Math.max(0, OTP_RULES.maxWrong - c.attempts - 1) }
  }
  return { ok: true }
}

export type RequestDecision = { ok: true } | { ok: false; reason: "too_many_for_number" | "too_many_from_ip" | "resend_too_soon" | "resend_limit"; retryAfterMs?: number }

/** Whether another code may be sent now. sentLastHour* count sends (first sends + resends). */
export function requestDecision(input: {
  resend: boolean
  active?: Pick<Challenge, "sends" | "last_sent_at">
  sentLastHourToIdentifier: number
  sentLastHourFromIp: number
  now?: Date
}): RequestDecision {
  const now = input.now ?? new Date()
  if (input.sentLastHourToIdentifier >= OTP_RULES.perIdentifierPerHour) return { ok: false, reason: "too_many_for_number" }
  if (input.sentLastHourFromIp >= OTP_RULES.perIpPerHour) return { ok: false, reason: "too_many_from_ip" }
  if (input.resend && input.active) {
    const wait = new Date(input.active.last_sent_at).getTime() + OTP_RULES.resendAfterMs - now.getTime()
    if (wait > 0) return { ok: false, reason: "resend_too_soon", retryAfterMs: wait }
    if (input.active.sends - 1 >= OTP_RULES.maxResends) return { ok: false, reason: "resend_limit" }
  }
  return { ok: true }
}

// ── Login ticket (verify route → auth provider) ────────────────────────────
// "<b64url(entityId.expMs)>~<hmac>" — short-lived, signed; the auth provider
// only accepts what our verify route issued.
export function createTicket(secret: string, entityId: string, now = Date.now()) {
  const payload = Buffer.from(`${entityId}.${now + OTP_RULES.ticketTtlMs}`).toString("base64url")
  return `${payload}~${createHmac("sha256", secret).update(payload).digest("base64url")}`
}

export function readTicket(secret: string, ticket: string, now = Date.now()): string | null {
  const [payload, sig] = String(ticket).split("~")
  if (!payload || !sig || !safeEqual(sig, createHmac("sha256", secret).update(payload).digest("base64url"))) return null
  const raw = Buffer.from(payload, "base64url").toString()
  const cut = raw.lastIndexOf(".")
  const entityId = raw.slice(0, cut)
  return entityId && Number(raw.slice(cut + 1)) > now ? entityId : null
}

/** Identity key for the auth provider: "tel:+919876543210" or "email:a@b.in". */
export const entityIdFor = (t: { phone?: string; email?: string }) => (t.phone ? `tel:${t.phone}` : `email:${t.email!.toLowerCase()}`)
