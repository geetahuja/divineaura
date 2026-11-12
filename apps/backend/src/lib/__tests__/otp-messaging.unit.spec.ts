import { channelsFor, maskPhone, otpChannel, parseMap } from "../../modules/messaging/channels"
import { dltText, render, TEMPLATES } from "../../modules/messaging/templates"
import { createTicket, hashCode, OTP_RULES, readTicket, requestDecision, verifyDecision } from "../otp"

const S = "secret"
const id = "tel:+919876543210"
const now = new Date("2026-11-11T10:00:00Z")
const challenge = (o: Partial<Parameters<typeof verifyDecision>[3] & object> = {}) => ({
  code_hash: hashCode(S, id, "123456"),
  expires_at: new Date(now.getTime() + OTP_RULES.ttlMs),
  attempts: 0,
  sends: 1,
  consumed_at: null,
  last_sent_at: now,
  ...o,
})

describe("OTP verify", () => {
  it("accepts the right code once, within 5 minutes", () => {
    expect(verifyDecision(S, id, "123456", challenge(), now)).toEqual({ ok: true })
    expect(verifyDecision(S, id, "123456", challenge({ consumed_at: now }), now)).toEqual({ ok: false, reason: "used" }) // reuse refused
  })
  it("expires after 5 minutes", () => {
    expect(verifyDecision(S, id, "123456", challenge(), new Date(now.getTime() + OTP_RULES.ttlMs))).toMatchObject({ reason: "expired" })
  })
  it("counts wrong attempts and locks after 5", () => {
    expect(verifyDecision(S, id, "000000", challenge({ attempts: 3 }), now)).toEqual({ ok: false, reason: "wrong", attemptsLeft: 1 })
    expect(verifyDecision(S, id, "123456", challenge({ attempts: 5 }), now)).toMatchObject({ reason: "locked" }) // even the right code
  })
  it("never matches a code for another number", () => {
    expect(verifyDecision(S, "tel:+919999999999", "123456", challenge(), now)).toMatchObject({ reason: "wrong" })
  })
})

describe("OTP requests", () => {
  const base = { resend: true, sentLastHourToIdentifier: 1, sentLastHourFromIp: 1, now }
  it("waits 30 s before a resend and allows at most 3", () => {
    expect(requestDecision({ ...base, active: { sends: 1, last_sent_at: now } })).toMatchObject({ ok: false, reason: "resend_too_soon" })
    const later = new Date(now.getTime() + 31_000)
    expect(requestDecision({ ...base, now: later, active: { sends: 3, last_sent_at: now } })).toEqual({ ok: true })
    expect(requestDecision({ ...base, now: later, active: { sends: 4, last_sent_at: now } })).toMatchObject({ reason: "resend_limit" })
  })
  it("rate-limits per number and per IP", () => {
    expect(requestDecision({ resend: false, sentLastHourToIdentifier: 10, sentLastHourFromIp: 0 })).toMatchObject({ reason: "too_many_for_number" })
    expect(requestDecision({ resend: false, sentLastHourToIdentifier: 0, sentLastHourFromIp: 20 })).toMatchObject({ reason: "too_many_from_ip" })
  })
})

describe("login ticket", () => {
  it("round-trips, expires and can't be forged", () => {
    const t = createTicket(S, id, now.getTime())
    expect(readTicket(S, t, now.getTime())).toBe(id)
    expect(readTicket(S, t, now.getTime() + OTP_RULES.ticketTtlMs + 1)).toBeNull()
    expect(readTicket("other", t, now.getTime())).toBeNull()
  })
})

describe("messaging channels", () => {
  const tpl = { category: "transactional" as const, sms: "x", whatsapp: {}, email: {} }
  const to = { phone: "+919876543210", email: "a@b.in" }
  it("follows MESSAGING_CHANNEL and adds email when known", () => {
    expect(channelsFor("console", to, tpl)).toEqual(["sms", "email"])
    expect(channelsFor("whatsapp", to, tpl)).toEqual(["whatsapp", "email"])
    expect(channelsFor("both", { phone: to.phone }, tpl)).toEqual(["sms", "whatsapp"])
  })
  it("sends marketing only with per-channel opt-in", () => {
    expect(channelsFor("both", to, { ...tpl, category: "marketing" }, { whatsapp: true })).toEqual(["whatsapp"])
  })
  it("OTP falls back to WhatsApp on resend with sms_then_whatsapp", () => {
    expect(otpChannel("sms_then_whatsapp", 0)).toBe("sms")
    expect(otpChannel("sms_then_whatsapp", 1)).toBe("whatsapp")
    expect(otpChannel("sms", 2)).toBe("sms")
  })
  it("masks and parses config", () => {
    expect(maskPhone("+919876543210")).toBe("+91••••••3210")
    expect(parseMap("order_placed=1207a, otp_login=1207b")).toEqual({ order_placed: "1207a", otp_login: "1207b" })
  })
})

describe("templates", () => {
  const sample: Record<string, string> = { otp: "123456", domain: "divinesanatani.com", order: "10245", amount: "1,299", link: "https://divinesanatani.com/track-order", hours: "24", courier: "Delhivery Surface", reason: "not confirmed in time", awb: "RTEST1234567890", invoice: "https://api.divinesanatani.com/documents/i_inv_01ABC~sig", code: "REVIEW-A961DC05", percent: "10" }
  it("fills every variable and throws on a missing one", () => {
    expect(render("Order #{order}", { order: "1" })).toBe("Order #1")
    expect(() => render("Order #{order}", {})).toThrow(/order/)
  })
  it("keeps SMS GSM-7 (no ₹) and within 160 chars with realistic values (except the OTP's Web OTP line)", () => {
    for (const [key, t] of Object.entries(TEMPLATES)) {
      const sms = (t as { sms?: string }).sms
      if (!sms) continue
      const text = render(sms, sample)
      expect(text).not.toMatch(/₹/)
      if (key !== "otp_login") expect(text.length).toBeLessThanOrEqual(160)
    }
    expect(dltText("Hi {order}, Rs.{amount}")).toBe("Hi {#var#}, Rs.{#var#}")
  })
})
