import "server-only"
import { sdk } from "@lib/config"
import { parseTag, TagKind } from "@lib/slug"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from "./regions"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"

// Admin changes show up within 5 minutes (ISR-style data cache).
const cached = { next: { revalidate: 300 }, cache: "force-cache" as const }
const PAGE = 100

export type Category = {
  id: string
  name: string
  handle: string
  rank: number
  parent_id: string | null
  description: string | null
}
// image_url: optional tile image uploaded in admin (tag metadata).
export type Tag = { value: string; kind: TagKind; label: string; slug: string; image_url: string | null }
export type Collection = { id: string; title: string; handle: string }

export type CatalogueProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  created_at: string
  category_ids: string[]
  collection_id: string | null
  tags: string[] // raw values, e.g. "deity:Hanuman", "bestseller"
  material: string | null // stone type, else material (product specs)
  price: number | null // cheapest variant, ₹, GST-inclusive
  mrp: number | null // struck-through price, only when above `price`
  in_stock: boolean
  // Set when the product has exactly one variant: quick add can skip the product page.
  single_variant_id: string | null
}

export async function listCategories(): Promise<Category[]> {
  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>("/store/product-categories", {
      query: { fields: "id,name,handle,rank,parent_category_id,description", limit: 500 },
      ...cached,
    })
    .then((r) =>
      r.product_categories
        .map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          rank: c.rank ?? 0,
          parent_id: c.parent_category_id ?? null,
          description: c.description || null,
        }))
        .sort((a, b) => a.rank - b.rank)
    )
    .catch(() => [])
}

export async function listTags(): Promise<Tag[]> {
  return sdk.client
    .fetch<{ product_tags: HttpTypes.StoreProductTag[] }>("/store/product-tags", {
      query: { fields: "id,value,metadata", limit: 500 },
      ...cached,
    })
    .then((r) =>
      r.product_tags
        .map((t) => {
          const p = parseTag(t.value)
          const image = t.metadata?.image_url
          return p ? { value: t.value, ...p, image_url: typeof image === "string" && image ? image : null } : null
        })
        .filter((t): t is Tag => !!t)
        .sort((a, b) => a.label.localeCompare(b.label))
    )
    .catch(() => [])
}

export async function listCollectionsAll(): Promise<Collection[]> {
  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[] }>("/store/collections", {
      query: { fields: "id,title,handle", limit: 200 },
      ...cached,
    })
    .then((r) => r.collections.map((c) => ({ id: c.id, title: c.title, handle: c.handle })))
    .catch(() => [])
}

// Ancestors first: [Bracelets, Gemstone]. URL is /category/bracelets/gemstone-bracelets.
export const categoryTrail = (cat: Category, all: Category[]): Category[] => {
  const parent = cat.parent_id ? all.find((c) => c.id === cat.parent_id) : undefined
  return parent ? [...categoryTrail(parent, all), cat] : [cat]
}
export const categoryHref = (cat: Category, all: Category[]) =>
  `/category/${categoryTrail(cat, all).map((c) => c.handle).join("/")}`

// Slug → tag, computed from the live tag list so new admin tags work automatically.
export async function findTag(kind: TagKind, slug: string) {
  return (await listTags()).find((t) => t.kind === kind && t.slug === slug) ?? null
}

type RawVariant = {
  id: string
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_quantity?: number | null
  metadata?: Record<string, unknown> | null
  calculated_price?: { calculated_amount?: number | null; original_amount?: number | null } | null
}
type RawProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  created_at: string
  collection_id: string | null
  categories?: { id: string }[] | null
  tags?: { value: string }[] | null
  variants?: RawVariant[] | null
  product_specs?: { material?: string | null; stone_type?: string | null } | null
}

const toCatalogueProduct = (p: RawProduct): CatalogueProduct => {
  const variants = (p.variants ?? []).filter((v) => v.calculated_price?.calculated_amount != null)
  const cheapest = [...variants].sort(
    (a, b) => a.calculated_price!.calculated_amount! - b.calculated_price!.calculated_amount!
  )[0]
  const price = cheapest?.calculated_price?.calculated_amount ?? null
  // MRP: admin-entered variant MRP, else the pre-sale price when a price list applies.
  const mrpRaw = Number(cheapest?.metadata?.mrp) || cheapest?.calculated_price?.original_amount || null
  const inStock = (v: RawVariant) => !v.manage_inventory || !!v.allow_backorder || (v.inventory_quantity ?? 0) > 0

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail,
    created_at: p.created_at,
    category_ids: (p.categories ?? []).map((c) => c.id),
    collection_id: p.collection_id,
    tags: (p.tags ?? []).map((t) => t.value),
    material: p.product_specs?.stone_type || p.product_specs?.material || null,
    price,
    mrp: price != null && mrpRaw != null && mrpRaw > price ? mrpRaw : null,
    in_stock: (p.variants ?? []).some(inStock),
    single_variant_id: p.variants?.length === 1 && inStock(p.variants[0]) ? p.variants[0].id : null,
  }
}

// ponytail: every published product is fetched (cached) and filtered/sorted in
// memory — fine up to ~2,000 products. Beyond that, move filtering to the
// /store/search index (backend src/search/product.ts) and add specs + stock to it.
export async function listCatalogue(): Promise<CatalogueProduct[]> {
  const region = await getRegion(DEFAULT_COUNTRY_CODE)
  if (!region) {
    return []
  }
  const fields = [
    "id,title,handle,thumbnail,created_at,collection_id",
    "*categories",
    "tags.value",
    "*variants",
    "*variants.calculated_price",
    "+variants.inventory_quantity",
    "product_specs.material,product_specs.stone_type",
  ].join(",")

  const all: RawProduct[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { products, count } = await sdk.client.fetch<{ products: RawProduct[]; count: number }>(
      "/store/products",
      { query: { fields, region_id: region.id, limit: PAGE, offset }, ...cached }
    )
    all.push(...products)
    if (offset + PAGE >= count || !products.length) {
      break
    }
  }
  return all.map(toCatalogueProduct)
}
