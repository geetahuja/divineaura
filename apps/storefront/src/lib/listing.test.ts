// Run: node --import jiti/register --test src/lib/listing.test.ts  (pnpm test)
import assert from "node:assert/strict"
import { test } from "node:test"
import type { CatalogueProduct, Category, Tag } from "./data/catalogue"
import { parseFilters, runListing } from "./listing"
import { parseTag, slugify } from "./slug"

const cats: Category[] = [
  { id: "c1", name: "Bracelets", handle: "bracelets", rank: 0, parent_id: null, description: null },
  { id: "c2", name: "Gemstone", handle: "gemstone-bracelets", rank: 0, parent_id: "c1", description: null },
  { id: "c3", name: "Lockets", handle: "lockets", rank: 1, parent_id: null, description: null },
]
const tags: Tag[] = ["deity:Sai Baba", "intention:Focus & Confidence"].map((v) => ({ value: v, ...parseTag(v)! }))
const p = (id: string, o: Partial<CatalogueProduct>): CatalogueProduct => ({
  id, title: id, handle: id, thumbnail: null, created_at: "2026-01-01", category_ids: [], collection_id: null,
  tags: [], material: null, price: 100, mrp: null, in_stock: true, single_variant_id: null, ...o,
})
const products = [
  p("tiger", { category_ids: ["c2"], price: 699, material: "Tiger Eye", tags: ["intention:Focus & Confidence"], created_at: "2026-03-01" }),
  p("locket", { category_ids: ["c3"], price: 449, tags: ["deity:Sai Baba", "bestseller"], in_stock: false }),
  p("chakra", { category_ids: ["c2"], price: 899, created_at: "2026-02-01" }),
]

test("slugs", () => {
  assert.equal(slugify("Focus & Confidence"), "focus-confidence")
  assert.equal(slugify("Sai Baba"), "sai-baba")
  assert.equal(parseTag("bestseller"), null)
})

test("parent category includes child products; sort and filters", () => {
  const r = runListing(products, parseFilters({ type: "bracelets", sort: "price-desc" }), cats, tags)
  assert.deepEqual(r.products.map((x) => x.id), ["chakra", "tiger"])

  const popular = runListing(products, parseFilters({}), cats, tags)
  assert.equal(popular.products[0].id, "locket") // bestseller first
  assert.equal(popular.products[1].id, "tiger") // then newest

  assert.equal(runListing(products, parseFilters({ stock: "in" }), cats, tags).total, 2)
  assert.equal(runListing(products, parseFilters({ min: "500", max: "800" }), cats, tags).products[0].id, "tiger")
  assert.equal(runListing(products, parseFilters({ intention: "focus-confidence" }), cats, tags).total, 1)
  assert.equal(runListing(products, parseFilters({ material: "tiger-eye,x" }), cats, tags).total, 1)
})

test("facet counts ignore their own group, junk params are safe", () => {
  const r = runListing(products, parseFilters({ deity: "sai-baba", sort: "bogus", page: "-3", min: "abc" }), cats, tags)
  assert.equal(r.total, 1)
  assert.deepEqual(r.facets.deity, [{ value: "sai-baba", label: "Sai Baba", count: 1 }])
  assert.equal(r.page, 1)
  assert.deepEqual(r.facets.price, { min: 449, max: 899 })

  const bracelets = products.filter((x) => x.category_ids.includes("c2"))
  const types = runListing(bracelets, parseFilters({}), cats, tags).facets.type
  assert.deepEqual(types, []) // every product is a gemstone bracelet: nothing to narrow
})
