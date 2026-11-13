import { model } from "@medusajs/framework/utils"

// Homepage "Sacred Places" entries, managed in Admin → Sacred Places.
// image_url only ever comes from an admin upload.
const SacredPlace = model.define("sacred_place", {
  id: model.id({ prefix: "splace" }).primaryKey(),
  name: model.text(),
  location: model.text(),
  description: model.text(),
  image_url: model.text().nullable(),
  image_credit: model.text().nullable(),
  // Full tag value, e.g. "deity:Shiva".
  deity_tag: model.text().nullable(),
  collection_id: model.text().nullable(),
  // Set = shown on the "Sacred Nashik" skyline strip with this short label.
  strip_label: model.text().nullable(),
  rank: model.number().default(0),
  visible: model.boolean().default(true),
})

export default SacredPlace
