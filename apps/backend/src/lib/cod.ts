import { createHmac, timingSafeEqual } from "node:crypto"

// Cash on Delivery + prepaid discount rules (ARCHITECTURE.md §5 rules 5–6).
// Pure functions: the routes, the complete-cart guard and the tests share them.

export const COD_PROVIDER_ID = "pp_cod_cod"
export const COD_FEE_ITEM_TYPE = "cod_fee" // line item metadata.type
export const PREPAID_PROMO_CODE = "PREPAID-ONLINE"

export type CodSettings = {
  cod_enabled: boolean
  cod_fee: number
  cod_max_order_value: number
  prepaid_discount_percent: number
  cod_confirm_minutes: number
}

export type CodIneligibleReason = "disabled" | "over_limit" | "pincode_blocked" | "no_address" | "courier_no_cod"

/**
 * COD is offered when it is switched on, the order value (merchandise, before
 * fees and discounts) is at or below the limit, and the PIN code is not blocked.
 */
export function codEligibility(
  s: CodSettings,
  input: { merchandiseTotal: number; pincode?: string | null; pincodeBlocked: boolean; courierCod?: boolean }
): { eligible: true } | { eligible: false; reason: CodIneligibleReason } {
  if (!s.cod_enabled) return { eligible: false, reason: "disabled" }
  if (!input.pincode) return { eligible: false, reason: "no_address" }
  if (input.pincodeBlocked) return { eligible: false, reason: "pincode_blocked" }
  // The courier must also offer COD for this PIN (unknown = allowed; checked again at shipment).
  if (input.courierCod === false) return { eligible: false, reason: "courier_no_cod" }
  if (input.merchandiseTotal > s.cod_max_order_value) return { eligible: false, reason: "over_limit" }
  return { eligible: true }
}

// Rupees off for paying online, rounded down to whole rupees (shown as "Save ₹X").
// The charged amount is computed by Medusa's promotion engine with the same %.
export const prepaidSaving = (merchandiseTotal: number, percent: number) =>
  percent > 0 ? Math.floor((merchandiseTotal * percent) / 100) : 0

export function validateSettings(s: Partial<CodSettings>): string | null {
  if (s.cod_fee !== undefined && (!Number.isInteger(s.cod_fee) || s.cod_fee < 0 || s.cod_fee > 500))
    return "COD fee must be a whole number of rupees between 0 and 500"
  if (s.cod_max_order_value !== undefined && (!Number.isInteger(s.cod_max_order_value) || s.cod_max_order_value < 1))
    return "Max COD order value must be a whole number of rupees above 0"
  if (s.prepaid_discount_percent !== undefined && (s.prepaid_discount_percent < 0 || s.prepaid_discount_percent > 50))
    return "Prepaid discount must be between 0 and 50%"
  if (s.cod_confirm_minutes !== undefined && (!Number.isInteger(s.cod_confirm_minutes) || s.cod_confirm_minutes < 1))
    return "Confirmation window must be at least 1 minute"
  return null
}

// "411001, 560001\n110 001" → ["411001", "560001"] (invalid entries reported separately).
export function parsePincodes(text: string) {
  const parts = text.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean)
  const valid = new Set<string>()
  const invalid: string[] = []
  for (const p of parts) {
    if (/^[1-9]\d{5}$/.test(p)) valid.add(p)
    else invalid.push(p)
  }
  return { valid: Array.from(valid), invalid }
}

// ── Confirm-link tokens ────────────────────────────────────────────────────
// "~" separates payload and signature: URL-safe, never produced by base64url,
// and not a "." (the storefront proxy treats dotted paths as static files).
const SEP = "~"

// token = base64url(orderId.expiresAtMs)~hmac — signed, so it can't be forged or
// edited; expiry is inside the signature. "Already used" is tracked in the DB.

const b64 = (s: string) => Buffer.from(s).toString("base64url")
const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("base64url")

export function createConfirmToken(secret: string, orderId: string, expiresAt: Date) {
  const payload = b64(`${orderId}.${expiresAt.getTime()}`)
  return `${payload}${SEP}${sign(secret, payload)}`
}

export function verifyConfirmToken(
  secret: string,
  token: string,
  now = new Date()
): { ok: true; orderId: string } | { ok: false; reason: "invalid" | "expired" } {
  const [payload, sig] = token.split(SEP)
  if (!payload || !sig) return { ok: false, reason: "invalid" }
  const expected = sign(secret, payload)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, reason: "invalid" }
  }
  const [orderId, exp] = Buffer.from(payload, "base64url").toString().split(".")
  if (!orderId || !Number(exp)) return { ok: false, reason: "invalid" }
  if (now.getTime() > Number(exp)) return { ok: false, reason: "expired" }
  return { ok: true, orderId }
}

// Pending confirmations whose window has passed (used by the auto-cancel job).
export const isExpired = (c: { status: string; expires_at: Date | string }, now = new Date()) =>
  c.status === "pending" && new Date(c.expires_at).getTime() <= now.getTime()
