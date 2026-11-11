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
  // Grievance officer (Consumer Protection (E-Commerce) Rules 2020) — shown on the Grievance page and footer.
  grievance_name: model.text().nullable(),
  grievance_email: model.text().nullable(),
  grievance_phone: model.text().nullable(),
  grievance_ack_hours: model.number().default(48),
  grievance_resolve_days: model.number().default(30),
})

export default BusinessSettings
