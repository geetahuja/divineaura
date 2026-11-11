import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { maskEmail, maskPhone } from "../../../modules/messaging/channels"
import { MESSAGING_MODULE } from "../../../modules/messaging"
import type MessagingModuleService from "../../../modules/messaging/service"

// GET /admin/message-log?order=15&phone=9876543210&limit=50&offset=0 — recipients masked.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, string | undefined>
  const filters: Record<string, unknown> = {}
  if (q.order) filters.order_number = Number(q.order.replace(/\D/g, "")) || -1
  if (q.phone) filters.recipient = { $like: `%${q.phone.replace(/\D/g, "").slice(-10)}` }
  const limit = Math.min(Number(q.limit) || 50, 200)
  const offset = Number(q.offset) || 0
  const [rows, count] = await req.scope
    .resolve<MessagingModuleService>(MESSAGING_MODULE)
    .listAndCountMessageLogs(filters, { order: { created_at: "DESC" }, take: limit, skip: offset })
  res.json({
    count,
    messages: rows.map((m) => ({
      id: m.id,
      event: m.event,
      channel: m.channel,
      recipient: m.recipient.includes("@") ? maskEmail(m.recipient) : maskPhone(m.recipient),
      status: m.status,
      provider: m.provider,
      provider_message_id: m.provider_message_id,
      error: m.error,
      order_number: m.order_number,
      created_at: m.created_at,
    })),
  })
}
