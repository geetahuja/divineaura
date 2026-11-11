import type { Logger } from "@medusajs/framework/types"

// Message templates. Text only here; SMS (DLT template IDs) and WhatsApp
// (approved template names) map these keys to their own templates in milestone 9.
const TEMPLATES = {
  cod_confirm: (d: Record<string, string>) =>
    `DivineAura: Please confirm your Cash on Delivery order #${d.order_number} of ${d.total}. Tap to confirm: ${d.link} (valid for ${d.valid_for}). Unconfirmed orders are cancelled automatically.`,
  cod_confirmed: (d: Record<string, string>) =>
    `DivineAura: Thank you! Your COD order #${d.order_number} is confirmed and will be shipped soon.`,
  cod_cancelled: (d: Record<string, string>) =>
    `DivineAura: Your COD order #${d.order_number} was cancelled (${d.reason}). You can order again anytime.`,
  order_status: (d: Record<string, string>) =>
    `DivineAura: Your order #${d.order_number} is ${d.status}.${d.tracking ? ` Track: ${d.tracking}` : ""}`,
} as const

export type MessageTemplate = keyof typeof TEMPLATES
export type SendInput = { to: { phone?: string | null; email?: string | null }; template: MessageTemplate; data: Record<string, string> }

/**
 * The only way features send customer messages (CLAUDE.md, ARCHITECTURE.md §19).
 * Channel is configuration, not code: "console" logs the message (development);
 * "sms" / "whatsapp" / "both" providers are added in milestone 9.
 */
export default class MessagingModuleService {
  private logger: Logger
  private channel: string

  constructor({ logger }: { logger: Logger }, options: { channel?: string } = {}) {
    this.logger = logger
    this.channel = options.channel ?? "console"
  }

  async send({ to, template, data }: SendInput) {
    const text = TEMPLATES[template](data)
    if (this.channel !== "console") {
      // ponytail: until milestone 9 every channel falls back to console, so nothing is silently dropped.
      this.logger.warn(`messaging: channel "${this.channel}" not implemented yet, using console`)
    }
    this.logger.info(`[message → ${to.phone ?? "-"} / ${to.email ?? "-"}] (${template}) ${text}`)
    return { channel: "console", text }
  }
}
