import { model } from "@medusajs/framework/utils"

// One GST invoice per order. `data` is the frozen snapshot the PDF is drawn from.
const Invoice = model
  .define("invoice", {
    id: model.id({ prefix: "inv" }).primaryKey(),
    order_id: model.text().unique(),
    number: model.text().unique(),
    issued_at: model.dateTime(),
    data: model.json(),
  })

export default Invoice
