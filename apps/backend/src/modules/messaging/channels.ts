import type { Category } from "./templates"

// Channel rules (ARCHITECTURE.md §19). Pure: configuration in, decision out.

export type Channel = "sms" | "whatsapp" | "email"
export type MessagingSetting = "console" | "sms" | "whatsapp" | "both"
export type OtpSetting = "sms" | "whatsapp" | "sms_then_whatsapp"
export type Consent = Partial<Record<Channel, boolean>> // marketing opt-ins per channel

export const parseMessaging = (v?: string): MessagingSetting =>
  (["console", "sms", "whatsapp", "both"] as const).find((x) => x === v) ?? "console"
export const parseOtp = (v?: string): OtpSetting => (["sms", "whatsapp", "sms_then_whatsapp"] as const).find((x) => x === v) ?? "sms"

/**
 * Channels for one message. Phone channels follow MESSAGING_CHANNEL ("console"
 * means: decide as for SMS, but deliver to the console). Email goes whenever the
 * recipient has an address and the template has an email version.
 * Marketing needs the recipient's opt-in for that channel; transactional/OTP never do.
 */
export function channelsFor(
  setting: MessagingSetting,
  to: { phone?: string | null; email?: string | null },
  template: { category: Category; sms?: unknown; whatsapp?: unknown; email?: unknown },
  consent: Consent = {}
): Channel[] {
  const phone: Channel[] = !to.phone
    ? []
    : setting === "both"
      ? ["sms", "whatsapp"]
      : setting === "whatsapp"
        ? ["whatsapp"]
        : ["sms"]
  const wanted = [...phone.filter((c) => (c === "sms" ? template.sms : template.whatsapp)), ...(to.email && template.email ? (["email"] as Channel[]) : [])]
  return template.category === "marketing" ? wanted.filter((c) => consent[c] === true) : wanted
}

/** OTP: SMS first; with sms_then_whatsapp, a resend (after the 30 s timer) goes by WhatsApp. */
export const otpChannel = (setting: OtpSetting, sendNumber: number): Channel =>
  setting === "whatsapp" ? "whatsapp" : setting === "sms_then_whatsapp" && sendNumber > 0 ? "whatsapp" : "sms"

export const maskPhone = (p: string) => (p.length > 4 ? `${p.slice(0, 3)}••••••${p.slice(-4)}` : "••••")
export const maskEmail = (e: string) => {
  const [u, d] = e.split("@")
  return d ? `${u.slice(0, 2)}•••@${d}` : "•••"
}

// "order_placed=1207xxx,otp_login=1207yyy" → { order_placed: "1207xxx", … }
export const parseMap = (v?: string) =>
  Object.fromEntries(
    (v ?? "")
      .split(",")
      .map((p) => p.split("=").map((s) => s.trim()))
      .filter(([k, val]) => k && val)
  ) as Record<string, string>
