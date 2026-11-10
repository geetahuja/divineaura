import { model } from "@medusajs/framework/utils"

// ARCHITECTURE.md §4. Everything optional so details can be filled in gradually;
// stone_origin is required by the API whenever stone_type is set.
export const STONE_ORIGINS = ["natural", "reconstituted", "dyed", "not_applicable"] as const

const ProductSpecs = model.define("product_specs", {
  id: model.id({ prefix: "pspec" }).primaryKey(),
  material: model.text().nullable(),
  stone_type: model.text().nullable(),
  stone_origin: model.enum([...STONE_ORIGINS]).nullable(),
  bead_size_mm: model.float().nullable(),
  bead_count: model.number().nullable(),
  length_cm: model.float().nullable(),
  dimensions_mm: model.text().nullable(),
  weight_g: model.float().nullable(),
  chain_included: model.boolean().nullable(),
  colour: model.text().nullable(),
  pack_quantity: model.number().nullable(),
  care_instructions: model.text().nullable(),
  mantra: model.text().nullable(),
  certificate_url: model.text().nullable(),
  country_of_origin: model.text().nullable(),
  hsn_code: model.text().nullable(),
})

export default ProductSpecs
