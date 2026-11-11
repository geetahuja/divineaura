import { model } from "@medusajs/framework/utils"

// Seller details printed on invoices (Admin → Business details). One row.
const BusinessSettings = model.define("business_settings", {
  id: model.id({ prefix: "bset" }).primaryKey(),
  legal_name: model.text().default("Jayshankar Enterprises"),
  brand_name: model.text().default("DivineAura"),
  address: model.text().default(""),
  state: model.text().default("Maharashtra"),
  gstin: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  invoice_prefix: model.text().default("DA"),
  credit_note_prefix: model.text().default("CN"),
  return_window_days: model.number().default(7),
})

export default BusinessSettings
