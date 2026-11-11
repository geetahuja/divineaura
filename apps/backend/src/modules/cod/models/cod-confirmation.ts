import { model } from "@medusajs/framework/utils"

// One per COD order (unique order_id), so an order can never get two
// confirmations. status moves pending → confirmed | cancelled exactly once.
const CodConfirmation = model.define("cod_confirmation", {
  id: model.id({ prefix: "codconf" }).primaryKey(),
  order_id: model.text().unique(),
  status: model.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  expires_at: model.dateTime(),
  confirmed_at: model.dateTime().nullable(),
  confirmed_by: model.enum(["customer", "admin"]).nullable(),
  cancelled_at: model.dateTime().nullable(),
  cancel_reason: model.text().nullable(),
})

export default CodConfirmation
