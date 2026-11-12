import { model } from "@medusajs/framework/utils"

// Admin → Shipping & couriers. One row. default_courier "auto" = Shiprocket when
// configured, else the test courier (staging/dev), else the manual courier.
const CourierSettings = model.define("courier_settings", {
  id: model.id({ prefix: "cset" }).primaryKey(),
  default_courier: model.text().default("auto"), // auto | shiprocket | manual | test
  manual_courier_name: model.text().nullable(), // pre-filled on manual shipments
  manual_tracking_url: model.text().nullable(), // template, {awb} is replaced
  manual_eta_min: model.number().default(3),
  manual_eta_max: model.number().default(7),
})

export default CourierSettings
