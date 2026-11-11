import { model } from "@medusajs/framework/utils"

// Customer-visible order timeline (ARCHITECTURE.md §5.8). Unique (order_id,
// status): a retried webhook or sync can never add a step twice.
const OrderEvent = model
  .define("order_event", {
    id: model.id({ prefix: "oev" }).primaryKey(),
    order_id: model.text(),
    status: model.enum(["placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "rto", "cancelled"]),
    occurred_at: model.dateTime(),
    source: model.text(), // order | payment | cod | admin | webhook | sync
    note: model.text().nullable(),
  })
  .indexes([{ on: ["order_id", "status"], unique: true }])

export default OrderEvent
