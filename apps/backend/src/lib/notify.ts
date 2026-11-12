import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"
import type { MessageEvent } from "../modules/messaging/templates"

/**
 * Order messages (ARCHITECTURE.md §10) — the only way order flows talk to
 * customers. Loads the order's contact details and sends through the messaging
 * layer, deduplicated per order + event. Links are short and built from
 * STOREFRONT_URL (= NEXT_PUBLIC_SITE_URL) so SMS stays under 160 characters.
 */
const site = () => (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
const rupees = (n: number) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })

export const links = {
  track: () => `${site()}/track-order`,
  help: () => `${site()}/contact`,
  shop: () => `${site()}/shop`,
  account: () => `${site()}/account/orders`,
}

export async function notifyOrder(
  container: MedusaContainer,
  event: Exclude<MessageEvent, "otp_login" | "admin_password_reset" | "backup_alert">,
  orderId: string,
  extra: Record<string, string> = {},
  opts: { dedupeKey?: string } = {}
) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "display_id", "total", "email", "shipping_address.phone", "customer.metadata"],
    filters: { id: orderId },
  })
  const o = data[0] as unknown as { display_id: number; total: number; email?: string | null; shipping_address?: { phone?: string | null } | null; customer?: { metadata?: Record<string, unknown> | null } | null } | undefined
  if (!o) return []
  const consent = (o.customer?.metadata?.marketing_consent ?? {}) as Record<string, boolean>
  const vars: Record<string, string> = {
    order: String(o.display_id),
    amount: rupees(o.total),
    link: event === "order_cancelled" ? links.shop() : event === "order_delivered" || event === "order_rto" ? links.help() : links.track(),
    ...extra,
  }
  return container
    .resolve<MessagingModuleService>(MESSAGING_MODULE)
    .sendMessage(event, { phone: o.shipping_address?.phone, email: o.email, consent }, vars, { orderId, orderNumber: o.display_id, dedupeKey: opts.dedupeKey })
}
