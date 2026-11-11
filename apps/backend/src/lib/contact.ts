import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../modules/content"
import type ContentModuleService from "../modules/content/service"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"

// Contact form + privacy requests → support inbox through the messaging layer.
const messaging = (c: MedusaContainer) => c.resolve<MessagingModuleService>(MESSAGING_MODULE)

// ponytail: in-memory per-IP limiter (one backend process on the VPS). Move to Redis if we run several.
const hits = new Map<string, number[]>()
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Too many messages. Please try again later.")
  hits.set(key, [...recent, now])
}

async function supportEmail(c: MedusaContainer) {
  const b = await c.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings()
  return { support: b.email || process.env.EMAIL_REPLY_TO || null, grievance: b.grievance_email || b.email || process.env.EMAIL_REPLY_TO || null, resolveDays: b.grievance_resolve_days }
}

const TOPICS: Record<string, string> = { order: "An order", product: "A product", return: "Return or refund", other: "Something else" }

export async function sendContactMessage(
  c: MedusaContainer,
  b: { name: string; email?: string | null; phone?: string | null; order_number?: string | null; topic: string; message: string },
  ip: string | null
) {
  rateLimit(`contact:${ip ?? "?"}`, 5, 3600_000)
  const { support } = await supportEmail(c)
  if (!support) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Support email is not set (Admin → Business details).")
  const contact = [b.email, b.phone].filter(Boolean).join(" · ")
  await messaging(c).sendMessage("contact_message", { email: support }, { name: b.name, contact, order: b.order_number || "—", topic: TOPICS[b.topic] ?? b.topic, message: b.message }, { dedupe: false })
  if (b.email) await messaging(c).sendMessage("contact_ack", { email: b.email }, { name: b.name }, { dedupe: false })
}

const KINDS: Record<string, string> = { delete_data: "delete my personal data", access_data: "get a copy of my personal data", correct_data: "correct my personal data" }

export async function createPrivacyRequest(
  c: MedusaContainer,
  b: { kind: "delete_data" | "access_data" | "correct_data"; name: string; email?: string | null; phone?: string | null; details?: string | null },
  ip: string | null
) {
  rateLimit(`privacy:${ip ?? "?"}`, 3, 3600_000)
  const r = await c.resolve<ContentModuleService>(CONTENT_MODULE).createPrivacyRequests({ kind: b.kind, name: b.name, email: b.email ?? null, phone: b.phone ?? null, details: b.details ?? null, ip })
  const { grievance, resolveDays } = await supportEmail(c)
  const admin = `${(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")}/app/privacy-requests`
  if (grievance)
    await messaging(c).sendMessage("privacy_request_admin", { email: grievance }, { kind: KINDS[b.kind], name: b.name, contact: [b.email, b.phone].filter(Boolean).join(" · "), details: b.details || "—", link: admin }, { dedupe: false })
  if (b.email) await messaging(c).sendMessage("privacy_request_ack", { email: b.email }, { name: b.name, kind: KINDS[b.kind], days: String(resolveDays) }, { dedupe: false })
  return r
}
