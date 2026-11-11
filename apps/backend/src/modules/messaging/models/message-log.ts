import { model } from "@medusajs/framework/utils"

// Every message attempt (ARCHITECTURE.md §19). dedupe_key (e.g. "order_shipped:order_123")
// + channel is unique, so the same event is never sent twice on a channel.
// The OTP code itself is never stored here.
const MessageLog = model
  .define("message_log", {
    id: model.id({ prefix: "msg" }).primaryKey(),
    event: model.text(),
    channel: model.text(), // sms | whatsapp | email
    recipient: model.text(), // full; masked in the admin API
    status: model.enum(["sending", "sent", "failed", "skipped"]).default("sending"),
    provider: model.text().nullable(),
    provider_message_id: model.text().nullable(),
    error: model.text().nullable(),
    order_id: model.text().nullable(),
    order_number: model.number().nullable(),
    dedupe_key: model.text().nullable(),
  })
  .indexes([
    { on: ["dedupe_key", "channel"], unique: true, where: "dedupe_key IS NOT NULL" },
    { on: ["order_id"] },
    { on: ["recipient"] },
  ])

export default MessageLog
