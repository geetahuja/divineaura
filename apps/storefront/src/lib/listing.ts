// Filtering, sorting and facet counts for listing pages (ARCHITECTURE.md §6).
// Pure functions: the URL search params are the only state.
// Relative imports keep it runnable by `node --test` (listing.test.ts).
import type { CatalogueProduct, Category, Tag } from "./data/catalogue"
import { parseTag, slugify } from "./slug"

// Admin tags a product "bestseller" to feature it on the homepage and rank it first.
export const BESTSELLER_TAG = "bestseller"

export const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const
export type Sort = (typeof SORTS)[number]["value"]

export const PAGE_SIZE = 24

export type Filters = {
  min: number | null
  max: number | null
  type: string[] // category handles
  deity: string[] // tag slugs
  intention: string[]
  material: string[] // slugified stone type / material
  inStock: boolean
  sort: Sort
  page: number
}

type Params = Record<string, string | string[] | undefined>

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean)
const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? n : null
}

export function parseFilters(params: Params): Filters {
  const sort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) as Sort
  return {
    min: num(params.min),
    max: num(params.max),
    type: list(params.type),
    deity: list(params.deity),
    intention: list(params.intention),
    material: list(params.material),
    inStock: (Array.isArray(params.stock) ? params.stock[0] : params.stock) === "in",
    sort: SORTS.some((s) => s.value === sort) ? sort : "popular",
    page: Math.max(1, Math.floor(num(params.page) ?? 1)),
  }
}

// Category id → itself plus all descendants, so "Bracelets" includes "Gemstone".
export function categoryClosure(categories: Category[]) {
  const children = new Map<string | null, Category[]>()
  categories.forEach((c) => children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c]))
  const closure = (id: string): string[] => [id, ...(children.get(id) ?? []).flatMap((c) => closure(c.id))]
  return new Map(categories.map((c) => [c.id, new Set(closure(c.id))]))
}

const tagSlugs = (p: CatalogueProduct, kind: "deity" | "intention") =>
  p.tags.map(parseTag).filter((t) => t?.kind === kind).map((t) => t!.slug)

type Ctx = { categories: Category[]; closure: Map<string, Set<string>> }

const inCategoryHandle = (p: CatalogueProduct, handle: string, ctx: Ctx) => {
  const cat = ctx.categories.find((c) => c.handle === handle)
  const ids = cat ? ctx.closure.get(cat.id) : undefined
  return !!ids && p.category_ids.some((id) => ids.has(id))
}

// Each filter group is OR within itself, AND across groups. `skip` leaves one
// group out — used for facet counts so a group's own options stay visible.
function matches(p: CatalogueProduct, f: Filters, ctx: Ctx, skip?: keyof Filters) {
  if (skip !== "min" && f.min !== null && (p.price ?? 0) < f.min) return false
  if (skip !== "max" && f.max !== null && (p.price ?? 0) > f.max) return false
  if (skip !== "type" && f.type.length && !f.type.some((h) => inCategoryHandle(p, h, ctx))) return false
  if (skip !== "deity" && f.deity.length && !tagSlugs(p, "deity").some((s) => f.deity.includes(s))) return false
  if (skip !== "intention" && f.intention.length && !tagSlugs(p, "intention").some((s) => f.intention.includes(s)))
    return false
  if (skip !== "material" && f.material.length && !(p.material && f.material.includes(slugify(p.material))))
    return false
  if (skip !== "inStock" && f.inStock && !p.in_stock) return false
  return true
}

const byNewest = (a: CatalogueProduct, b: CatalogueProduct) => b.created_at.localeCompare(a.created_at)
const priceOf = (p: CatalogueProduct, missing: number) => p.price ?? missing

function sortProducts(products: CatalogueProduct[], sort: Sort) {
  const s = [...products]
  switch (sort) {
    case "newest":
      return s.sort(byNewest)
    case "price-asc":
      return s.sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity) || byNewest(a, b))
    case "price-desc":
      return s.sort((a, b) => priceOf(b, -1) - priceOf(a, -1) || byNewest(a, b))
    default:
      // ponytail: "popular" = admin-tagged bestsellers first, then newest. Switch
      // to real sales counts once there are orders (milestone 6+).
      return s.sort(
        (a, b) =>
          Number(b.tags.includes(BESTSELLER_TAG)) - Number(a.tags.includes(BESTSELLER_TAG)) || byNewest(a, b)
      )
  }
}

export type FacetOption = { value: string; label: string; count: number }
export type Facets = {
  type: FacetOption[]
  deity: FacetOption[]
  intention: FacetOption[]
  material: FacetOption[]
  price: { min: number; max: number } | null
}

const count = (items: { value: string; label: string }[]) => {
  const m = new Map<string, FacetOption>()
  items.forEach(({ value, label }) => {
    const o = m.get(value) ?? { value, label, count: 0 }
    o.count++
    m.set(value, o)
  })
  return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * `base` = the products this page is about (all, one category, one deity…).
 * Returns the current page of filtered + sorted products, the total count and
 * facet options with counts (each group counted with the other groups applied).
 */
export function runListing(
  base: CatalogueProduct[],
  f: Filters,
  categories: Category[],
  tags: Tag[]
) {
  const ctx: Ctx = { categories, closure: categoryClosure(categories) }
  const filtered = sortProducts(
    base.filter((p) => matches(p, f, ctx)),
    f.sort
  )
  const others = (skip: keyof Filters) => base.filter((p) => matches(p, f, ctx, skip))

  const tagLabel = (kind: "deity" | "intention", slug: string) =>
    tags.find((t) => t.kind === kind && t.slug === slug)?.label ?? slug
  const tagFacet = (kind: "deity" | "intention") =>
    count(others(kind).flatMap((p) => tagSlugs(p, kind).map((s) => ({ value: s, label: tagLabel(kind, s) }))))

  const typeBase = others("type")
  const facets: Facets = {
    type: categories
      .map((c) => ({
        value: c.handle,
        label: c.parent_id ? `${categories.find((x) => x.id === c.parent_id)?.name ?? ""} › ${c.name}` : c.name,
        count: typeBase.filter((p) => inCategoryHandle(p, c.handle, ctx)).length,
      }))
      // Drop options that can't narrow anything (e.g. "Bracelets" on the bracelets page).
      .filter((o) => o.count > 0 && (o.count < typeBase.length || f.type.includes(o.value)))
      .sort((a, b) => a.label.localeCompare(b.label)),
    deity: tagFacet("deity"),
    intention: tagFacet("intention"),
    material: count(
      others("material")
        .filter((p) => p.material)
        .map((p) => ({ value: slugify(p.material!), label: p.material! }))
    ),
    price: (() => {
      const prices = base.map((p) => p.price).filter((n): n is number => n != null)
      return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null
    })(),
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(f.page, pages)
  return {
    products: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    pages,
    facets,
  }
}

export const hasActiveFilters = (f: Filters) =>
  f.min !== null || f.max !== null || f.type.length + f.deity.length + f.intention.length + f.material.length > 0 || f.inStock
