import { model } from "@medusajs/framework/utils"

// Customer return (ARCHITECTURE.md §10). items: [{ item_id, title, quantity, amount }].
// payout_* holds a COD customer's UPI / bank details, AES-GCM encrypted, wiped once paid.
const ReturnRequest = model
  .define("return_request", {
    id: model.id({ prefix: "rtn" }).primaryKey(),
    order_id: model.text(),
    order_number: model.number(),
    status: model.enum(["requested", "approved", "rejected", "received", "refunded"]).default("requested"),
    items: model.json(),
    reason: model.text(),
    details: model.text().nullable(),
    photos: model.json().nullable(),
    refund_amount: model.bigNumber(),
    refund_method: model.enum(["original", "manual"]),
    payout_encrypted: model.text().nullable(),
    payout_hint: model.text().nullable(), // e.g. "UPI ••••@okicici"
    admin_note: model.text().nullable(),
    pickup_awb: model.text().nullable(),
    pickup_courier: model.text().nullable(),
    refunded_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["order_id"] }, { on: ["status"] }])

export default ReturnRequest
