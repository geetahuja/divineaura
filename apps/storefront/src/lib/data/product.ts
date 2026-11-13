import "server-only"
import { sdk } from "@lib/config"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from "./regions"

// Product details (backend product-specs module). The store route only
// allows these fields by name (no product_specs.* wildcard).
export const SPEC_FIELDS = [
  "material",
  "stone_type",
  "stone_origin",
  "bead_size_mm",
  "bead_count",
  "length_cm",
  "dimensions_mm",
  "weight_g",
  "chain_included",
  "colour",
  "pack_quantity",
  "care_instructions",
  "mantra",
  "certificate_url",
  "country_of_origin",
  "hsn_code",
  "not_returnable",
] as const

export type ProductSpecs = Partial<Record<(typeof SPEC_FIELDS)[number], string | number | boolean | null>>
export type FullProduct = HttpTypes.StoreProduct & { product_specs?: ProductSpecs | null }

// One cached request per product page (revalidated every 60 s, like the page).
export async function getProduct(handle: string) {
  const region = await getRegion(DEFAULT_COUNTRY_CODE)
  if (!region) {
    return { product: null, region: null }
  }
  const fields = [
    // Listing relations replaces the default field set, so scalars are named too.
    "id,title,subtitle,handle,description,thumbnail,collection_id,created_at",
    "*images",
    "*options",
    "*options.values",
    "*variants",
    "*variants.options",
    "*variants.calculated_price",
    "+variants.inventory_quantity",
    "*categories",
    "tags.value",
    "*collection",
    "*type",
    ...SPEC_FIELDS.map((f) => `product_specs.${f}`),
  ].join(",")

  const product = await sdk.client
    .fetch<{ products: FullProduct[] }>("/store/products", {
      query: { handle, fields, region_id: region.id, limit: 1 },
      next: { revalidate: 60 },
      cache: "force-cache",
    })
    .then((r) => r.products[0] ?? null)
  return { product, region }
}
