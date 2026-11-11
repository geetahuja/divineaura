import type { Logger } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import { Channel, channelsFor, Consent, otpChannel, parseMap, parseMessaging, parseOtp } from "./channels"
import { renderEmail } from "./email-layout"
import MessageLog from "./models/message-log"
import NewsletterSubscriber from "./models/newsletter-subscriber"
import { ConsoleProvider, DeliveryProvider, Outgoing, providersFromEnv } from "./providers"
import { MessageEvent, render, TEMPLATES, TemplateSpec } from "./templates"

export type Recipient = { phone?: string | null; email?: string | null; consent?: Consent }
// dedupeKey overrides the default "<event>:<orderId>" (e.g. one message per refund).
export type SendOptions = { orderId?: string | null; orderNumber?: number | null; dedupe?: boolean; dedupeKey?: string }
export type SendOutcome = { channel: Channel; status: "sent" | "failed" | "skipped"; provider?: string }

const isUniqueViolation = (e: unknown) => /unique|duplicate|already exists/i.test(String((e as Error)?.message ?? e))

/**
 * The messaging layer (ARCHITECTURE.md §19). Features call ONLY sendMessage()
 * and sendOtp(); channel and provider come from .env:
 *   MESSAGING_CHANNEL = console | sms | whatsapp | both   (email added when the customer has one)
 *   OTP_CHANNEL       = sms | whatsapp | sms_then_whatsapp
 * Messages never throw into order flows: failures are logged in message_log.
 */
export default class MessagingModuleService extends MedusaService({ MessageLog, NewsletterSubscriber }) {
  protected logger_: Logger
  private providers: Record<Channel, DeliveryProvider>
  private console: ConsoleProvider

  constructor(container: { logger: Logger }, ...rest: unknown[]) {
    super(container, ...rest)
    this.logger_ = container.logger
    this.console = new ConsoleProvider(container.logger)
    this.providers = providersFromEnv(container.logger)
  }

  private get setting() {
    return parseMessaging(process.env.MESSAGING_CHANNEL)
  }
  private siteUrl() {
    return (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  }
  // console mode: phone channels go to the console; email uses its own provider (console until RESEND_API_KEY).
  private providerFor(channel: Channel) {
    if (channel === "email") return this.providers.email
    return this.setting === "console" ? this.console : this.providers[channel]
  }

  private build(event: string, tpl: TemplateSpec, channel: Channel, to: string, data: Record<string, string>): Outgoing {
    if (channel === "email") {
      const e = renderEmail(tpl.email!, data, this.siteUrl())
      return { channel, to, ...e }
    }
    const text = render(tpl.sms ?? "", data)
    if (channel === "sms") return { channel, to, text, templateId: parseMap(process.env.SMS_TEMPLATE_IDS)[event], vars: data }
    const wa = tpl.whatsapp!
    return {
      channel,
      to,
      text,
      templateName: parseMap(process.env.WHATSAPP_TEMPLATE_NAMES)[event] ?? wa.name,
      params: wa.params.map((k) => data[k]),
    }
  }

  private async deliver(event: string, channel: Channel, recipient: string, message: Outgoing, opts: SendOptions, provider: DeliveryProvider): Promise<SendOutcome> {
    const dedupe_key = opts.dedupe === false ? null : opts.dedupeKey ?? (opts.orderId ? `${event}:${opts.orderId}` : null)
    let log: { id: string }
    try {
      log = await this.createMessageLogs({ event, channel, recipient, order_id: opts.orderId ?? null, order_number: opts.orderNumber ?? null, dedupe_key, provider: provider.name })
    } catch (e) {
      if (dedupe_key && isUniqueViolation(e)) return { channel, status: "skipped" } // already sent for this order
      throw e
    }
    try {
      const r = await provider.send(message)
      await this.updateMessageLogs({ id: log.id, status: "sent", provider: r.provider, provider_message_id: r.id })
      return { channel, status: "sent", provider: r.provider }
    } catch (e) {
      this.logger_.error(`messaging: ${event} via ${channel} failed: ${(e as Error).message}`)
      await this.updateMessageLogs({ id: log.id, status: "failed", error: (e as Error).message.slice(0, 500) })
      return { channel, status: "failed", provider: provider.name }
    }
  }

  /** Send a customer message for an event (§10). Duplicate sends per order+event are skipped. */
  async sendMessage(event: Exclude<MessageEvent, "otp_login">, to: Recipient, data: Record<string, string>, opts: SendOptions = {}) {
    const tpl: TemplateSpec = TEMPLATES[event]
    const outcomes: SendOutcome[] = []
    for (const channel of channelsFor(this.setting, to, tpl, to.consent)) {
      const recipient = channel === "email" ? to.email! : to.phone!
      try {
        outcomes.push(await this.deliver(event, channel, recipient, this.build(event, tpl, channel, recipient, data), opts, this.providerFor(channel)))
      } catch (e) {
        this.logger_.error(`messaging: ${event} via ${channel} not sent: ${(e as Error).message}`)
        outcomes.push({ channel, status: "failed" })
      }
    }
    return outcomes
  }

  /**
   * Send a login code. sendNumber 0 = first send, 1+ = resends (OTP_CHANNEL
   * sms_then_whatsapp switches to WhatsApp for resends). The code is never
   * stored, and outside development it is never printed to the console.
   */
  async sendOtp(target: { phone?: string; email?: string }, code: string, sendNumber = 0) {
    const tpl: TemplateSpec = TEMPLATES.otp_login
    const channel: Channel = target.email ? "email" : otpChannel(parseOtp(process.env.OTP_CHANNEL), sendNumber)
    const recipient = (target.email ?? target.phone)!
    const data = { otp: code, domain: new URL(this.siteUrl()).hostname }
    let provider = this.providerFor(channel)
    if (provider.name === "console" && process.env.NODE_ENV === "production") {
      this.logger_.warn(`messaging: no ${channel} provider configured — login code NOT delivered (code hidden)`)
      provider = { name: "none", send: async () => { throw new Error(`no ${channel} provider configured`) } }
    }
    return this.deliver("otp_login", channel, recipient, this.build("otp_login", tpl, channel, recipient, data), { dedupe: false }, provider)
  }
}
