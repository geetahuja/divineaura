import { model } from "@medusajs/framework/utils"

// One courier shipment per order (AWB, label, courier). fulfillment_id links it
// to Medusa's own fulfillment so admin's native order view stays consistent.
const Shipment = model.define("shipment", {
  id: model.id({ prefix: "shp" }).primaryKey(),
  order_id: model.text().unique(),
  fulfillment_id: model.text().nullable(),
  courier: model.text(), // "test" | "shiprocket" | "manual"
  courier_name: model.text().nullable(),
  external_id: model.text().nullable(), // courier's shipment id
  awb: model.text().unique(),
  label_url: model.text().nullable(),
  tracking_url: model.text().nullable(),
  weight_g: model.number(),
})

export default Shipment
