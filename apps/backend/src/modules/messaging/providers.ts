import type { Logger } from "@medusajs/framework/types"
import type { Channel } from "./channels"

/**
 * Delivery providers. Chosen by .env only (no code change):
 *  - SMS: MSG91 Flow API with DLT (MSG91_AUTH_KEY, SMS_SENDER_ID, DLT_ENTITY_ID, SMS_TEMPLATE_IDS)
 *  - WhatsApp: WHATSAPP_PROVIDER=meta (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) or msg91
 *  - Email: Resend (RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO)
 * Anything not configured falls back to the console provider.
 *
 * ⚠ The live API calls below are written from the providers' public docs but are
 * UNTESTED — TO VERIFY WITH A REAL ACCOUNT before launch (payload field names,
 * response ids, error formats).
 */

export type Outgoing =
  | { channel: "sms"; to: string; text: string; templateId?: string; vars: Record<string, string> }
  | { channel: "whatsapp"; to: string; templateName: string; params: string[]; text: string }
  | { channel: "email"; to: string; subject: string; html: string; text: string }

export type SendResult = { provider: string; id: string | null }

export interface DeliveryProvider {
  name: string
  send(m: Outgoing): Promise<SendResult>
}

export class ConsoleProvider implements DeliveryProvider {
  name = "console"
  constructor(private logger: Logger) {}
  async send(m: Outgoing) {
    const body = m.channel === "email" ? `${m.subject}\n${m.text}` : m.text
    this.logger.info(`[${m.channel} → ${m.to}] ${body}`)
    return { provider: "console", id: null }
  }
}

const json = async (r: Response) => {
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(body).slice(0, 300)}`)
  return body as Record<string, unknown>
}

// TO VERIFY WITH A REAL ACCOUNT: MSG91 Flow API (DLT template id + named variables).
export class Msg91Sms implements DeliveryProvider {
  name = "msg91"
  constructor(private cfg: { authKey: string; sender: string; dltEntityId: string }) {}
  async send(m: Outgoing) {
    if (m.channel !== "sms") throw new Error("msg91 sms: wrong channel")
    if (!m.templateId) throw new Error("No DLT template id for this message (SMS_TEMPLATE_IDS)")
    const r = await json(
      await fetch("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: { authkey: this.cfg.authKey, "content-type": "application/json" },
        body: JSON.stringify({
          template_id: m.templateId,
          sender: this.cfg.sender,
          DLT_TE_ID: this.cfg.dltEntityId,
          short_url: "0",
          recipients: [{ mobiles: m.to.replace(/^\+/, ""), ...m.vars }],
        }),
      })
    )
    return { provider: "msg91", id: (r.request_id as string) ?? (r.message as string) ?? null }
  }
}

// TO VERIFY WITH A REAL ACCOUNT: Meta WhatsApp Cloud API template message.
export class MetaWhatsApp implements DeliveryProvider {
  name = "meta"
  constructor(private cfg: { phoneNumberId: string; token: string }) {}
  async send(m: Outgoing) {
    if (m.channel !== "whatsapp") throw new Error("whatsapp: wrong channel")
    const r = await json(
      await fetch(`https://graph.facebook.com/v20.0/${this.cfg.phoneNumberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.cfg.token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: m.to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: m.templateName,
            language: { code: "en" },
            components: [{ type: "body", parameters: m.params.map((text) => ({ type: "text", text })) }],
          },
        }),
      })
    )
    return { provider: "meta", id: ((r.messages as { id: string }[] | undefined)?.[0]?.id) ?? null }
  }
}

// TO VERIFY WITH A REAL ACCOUNT: MSG91 WhatsApp outbound template message.
export class Msg91WhatsApp implements DeliveryProvider {
  name = "msg91-whatsapp"
  constructor(private cfg: { authKey: string; integratedNumber: string }) {}
  async send(m: Outgoing) {
    if (m.channel !== "whatsapp") throw new Error("whatsapp: wrong channel")
    const r = await json(
      await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: { authkey: this.cfg.authKey, "content-type": "application/json" },
        body: JSON.stringify({
          integrated_number: this.cfg.integratedNumber,
          content_type: "template",
          payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: {
              name: m.templateName,
              language: { code: "en", policy: "deterministic" },
              to_and_components: [
                { to: [m.to.replace(/^\+/, "")], components: Object.fromEntries(m.params.map((v, i) => [`body_${i + 1}`, { type: "text", value: v }])) },
              ],
            },
          },
        }),
      })
    )
    return { provider: "msg91-whatsapp", id: (r.request_id as string) ?? null }
  }
}

// TO VERIFY WITH A REAL ACCOUNT: Resend email API.
export class ResendEmail implements DeliveryProvider {
  name = "resend"
  constructor(private cfg: { apiKey: string; from: string; replyTo: string }) {}
  async send(m: Outgoing) {
    if (m.channel !== "email") throw new Error("resend: wrong channel")
    const r = await json(
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${this.cfg.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: this.cfg.from, to: [m.to], reply_to: this.cfg.replyTo, subject: m.subject, html: m.html, text: m.text }),
      })
    )
    return { provider: "resend", id: (r.id as string) ?? null }
  }
}

/** Provider per channel from .env; console when a channel isn't configured. */
export function providersFromEnv(logger: Logger, env = process.env): Record<Channel, DeliveryProvider> {
  const consoleP = new ConsoleProvider(logger)
  const sms = env.MSG91_AUTH_KEY && env.SMS_SENDER_ID ? new Msg91Sms({ authKey: env.MSG91_AUTH_KEY, sender: env.SMS_SENDER_ID, dltEntityId: env.DLT_ENTITY_ID ?? "" }) : consoleP
  const whatsapp =
    env.WHATSAPP_PROVIDER === "msg91" && env.MSG91_AUTH_KEY && env.MSG91_WHATSAPP_NUMBER
      ? new Msg91WhatsApp({ authKey: env.MSG91_AUTH_KEY, integratedNumber: env.MSG91_WHATSAPP_NUMBER })
      : env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN
        ? new MetaWhatsApp({ phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, token: env.WHATSAPP_ACCESS_TOKEN })
        : consoleP
  const email = env.RESEND_API_KEY
    ? new ResendEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM ?? "DivineAura <noreply@divineaura.com>", replyTo: env.EMAIL_REPLY_TO ?? "support@divineaura.com" })
    : consoleP
  return { sms, whatsapp, email }
}
