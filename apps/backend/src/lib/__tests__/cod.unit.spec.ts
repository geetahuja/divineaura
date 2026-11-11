import {
  codEligibility,
  createConfirmToken,
  isExpired,
  parsePincodes,
  prepaidSaving,
  validateSettings,
  verifyConfirmToken,
} from "../cod"

const settings = { cod_enabled: true, cod_fee: 49, cod_max_order_value: 3000, prepaid_discount_percent: 5, cod_confirm_minutes: 1440 }

describe("COD eligibility", () => {
  const ok = { merchandiseTotal: 1500, pincode: "411001", pincodeBlocked: false }
  it("allows orders at or below the limit", () => {
    expect(codEligibility(settings, ok)).toEqual({ eligible: true })
    expect(codEligibility(settings, { ...ok, merchandiseTotal: 3000 })).toEqual({ eligible: true })
  })
  it("refuses over the limit, blocked PINs, missing address, or when switched off", () => {
    expect(codEligibility(settings, { ...ok, merchandiseTotal: 3001 })).toEqual({ eligible: false, reason: "over_limit" })
    expect(codEligibility(settings, { ...ok, pincodeBlocked: true })).toEqual({ eligible: false, reason: "pincode_blocked" })
    expect(codEligibility(settings, { ...ok, pincode: null })).toEqual({ eligible: false, reason: "no_address" })
    expect(codEligibility({ ...settings, cod_enabled: false }, ok)).toEqual({ eligible: false, reason: "disabled" })
  })
})

describe("prepaid discount and settings", () => {
  it("computes the saving in whole rupees, 0 when off", () => {
    expect(prepaidSaving(1299, 5)).toBe(64) // 64.95 → 64
    expect(prepaidSaving(1000, 0)).toBe(0)
  })
  it("validates admin input", () => {
    expect(validateSettings({ cod_fee: 49, prepaid_discount_percent: 5 })).toBeNull()
    expect(validateSettings({ cod_fee: -1 })).toMatch(/COD fee/)
    expect(validateSettings({ cod_fee: 49.5 })).toMatch(/COD fee/)
    expect(validateSettings({ prepaid_discount_percent: 80 })).toMatch(/Prepaid/)
    expect(validateSettings({ cod_confirm_minutes: 0 })).toMatch(/window/)
  })
  it("parses a pasted PIN list", () => {
    expect(parsePincodes("411001, 560001\n411001 110 001 abc")).toEqual({ valid: ["411001", "560001"], invalid: ["110", "001", "abc"] })
  })
})

describe("confirm-link tokens", () => {
  const secret = "test-secret"
  const future = new Date(Date.now() + 60_000)
  it("accepts a valid token", () => {
    expect(verifyConfirmToken(secret, createConfirmToken(secret, "order_123", future))).toEqual({ ok: true, orderId: "order_123" })
  })
  it("rejects expired, tampered and foreign-secret tokens", () => {
    const token = createConfirmToken(secret, "order_123", future)
    expect(verifyConfirmToken(secret, token, new Date(future.getTime() + 1))).toEqual({ ok: false, reason: "expired" })
    const [payload, sig] = token.split("~")
    const forged = `${Buffer.from("order_999." + future.getTime()).toString("base64url")}~${sig}`
    expect(verifyConfirmToken(secret, forged)).toEqual({ ok: false, reason: "invalid" })
    expect(verifyConfirmToken("other-secret", token)).toEqual({ ok: false, reason: "invalid" })
    expect(verifyConfirmToken(secret, `${payload}`)).toEqual({ ok: false, reason: "invalid" })
  })
})

describe("auto-cancel selection", () => {
  const now = new Date("2026-11-11T12:00:00Z")
  it("picks only pending confirmations past their window", () => {
    expect(isExpired({ status: "pending", expires_at: "2026-11-11T11:59:59Z" }, now)).toBe(true)
    expect(isExpired({ status: "pending", expires_at: "2026-11-11T12:00:01Z" }, now)).toBe(false)
    expect(isExpired({ status: "confirmed", expires_at: "2026-11-11T10:00:00Z" }, now)).toBe(false)
  })
})

describe("confirm-link URL safety", () => {
  it("has no '.' (the storefront proxy treats dotted paths as files) and only URL-safe characters", () => {
    const token = createConfirmToken("s", "order_01ABC", new Date(Date.now() + 60_000))
    expect(token).not.toContain(".")
    expect(token).toMatch(/^[A-Za-z0-9_~-]+$/)
  })
})
