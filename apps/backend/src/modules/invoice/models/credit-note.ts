import { model } from "@medusajs/framework/utils"

// Credit note per refund (or for a cancelled, unpaid invoiced order), linked to the invoice.
// source_key ("refund:<id>", "cancel:<order>", "manual:<return>") makes issuing idempotent.
const CreditNote = model.define("credit_note", {
  id: model.id({ prefix: "crn" }).primaryKey(),
  number: model.text().unique(),
  invoice_number: model.text(),
  order_id: model.text().index(),
  source_key: model.text().unique(),
  amount: model.bigNumber(),
  issued_at: model.dateTime(),
  data: model.json(),
})

export default CreditNote
