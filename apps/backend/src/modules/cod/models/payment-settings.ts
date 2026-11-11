import { model } from "@medusajs/framework/utils"

// Single row (id "default"): COD + prepaid settings, edited in Admin → COD & payments.
// Money in whole rupees, GST-inclusive.
const PaymentSettings = model.define("payment_settings", {
  id: model.id().primaryKey(),
  cod_enabled: model.boolean().default(true),
  cod_fee: model.number().default(49),
  cod_max_order_value: model.number().default(3000),
  prepaid_discount_percent: model.float().default(5),
  // Unconfirmed COD orders are auto-cancelled after this many minutes (24 h).
  cod_confirm_minutes: model.number().default(1440),
})

export default PaymentSettings
