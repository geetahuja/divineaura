import { model } from "@medusajs/framework/utils"

// Seller details printed on invoices (Admin → Business details). One row.
const BusinessSettings = model.define("business_settings", {
  id: model.id({ prefix: "bset" }).primaryKey(),
  legal_name: model.text().default("Jayshankar Enterprises"),
  brand_name: model.text().default("Anant Sanatan"),
  brand_name_hi: model.text().default("अनंत सनातन"),
  tagline_en: model.text().default("Beyond Eternity, Beyond Time."),
  tagline_hi: model.text().default("समय से पहले, समय के बाद भी।"),
  // Footer social links; empty = icon hidden.
  social_instagram: model.text().nullable(),
  social_facebook: model.text().nullable(),
  social_youtube: model.text().nullable(),
  social_pinterest: model.text().nullable(),
  // Kumbh / Goda Jal (homepage badge, Goda Jal pages). Legal Metrology "packed by" block.
  next_snan_label: model.text().nullable(),
  next_snan_date: model.text().nullable(), // YYYY-MM-DD
  goda_jal_dispatch_date: model.text().nullable(), // YYYY-MM-DD; pre-orders "Dispatches after …"
  goda_jal_packer: model.text().nullable(),
  address: model.text().default(""),
  state: model.text().default("Maharashtra"),
  gstin: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  invoice_prefix: model.text().default("AS"),
  credit_note_prefix: model.text().default("CN"),
  // GST scheme: "regular" (tax invoices, all India) or "composition" (Bill of Supply,
  // no tax collected, delivery only within the seller's state). lib/gst-scheme.ts.
  gst_scheme: model.enum(["regular", "composition"]).default("regular"),
  bill_of_supply_prefix: model.text().default("BOS"),
  return_window_days: model.number().default(7),
  // Grievance officer (Consumer Protection (E-Commerce) Rules 2020) — shown on the Grievance page and footer.
  grievance_name: model.text().nullable(),
  grievance_email: model.text().nullable(),
  grievance_phone: model.text().nullable(),
  grievance_ack_hours: model.number().default(48),
  grievance_resolve_days: model.number().default(30),
})

export default BusinessSettings
