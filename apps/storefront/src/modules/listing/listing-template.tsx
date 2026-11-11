import { CatalogueProduct, listCategories, listTags } from "@lib/data/catalogue"
import { hasActiveFilters, parseFilters, runListing } from "@lib/listing"
import { DEFAULT_OG_IMAGE, getSiteOrigin, STORE_NAME } from "@lib/util/site"
import type { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Breadcrumbs, { Crumb } from "./breadcrumbs"
import FilterLayout, { FilterGroup } from "./filter-layout"
import ProductCard from "./product-card"

export type SearchParams = Record<string, string | string[] | undefined>

// Canonical = the unfiltered page, so filter/sort URLs don't compete in search.
export async function listingMetadata(title: string, description: string, path: string): Promise<Metadata> {
  const url = `${await getSiteOrigin()}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: STORE_NAME, type: "website", images: [DEFAULT_OG_IMAGE] },
  }
}

export default async function ListingTemplate({
  title,
  intro,
  crumbs,
  products,
  searchParams,
  hide,
}: {
  title: string
  intro?: string | null
  crumbs: Crumb[]
  products: CatalogueProduct[]
  searchParams: SearchParams
  hide?: FilterGroup[]
}) {
  const [categories, tags, origin] = await Promise.all([listCategories(), listTags(), getSiteOrigin()])
  const filters = parseFilters(searchParams)
  const result = runListing(products, filters, categories, tags)
  const path = crumbs[crumbs.length - 1].href
  const activeCount =
    filters.type.length + filters.deity.length + filters.intention.length + filters.material.length +
    Number(filters.min !== null || filters.max !== null) + Number(filters.inStock)

  const pageHref = (page: number) => {
    const qs = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k !== "page" && v !== undefined) qs.set(k, Array.isArray(v) ? v.join(",") : v)
    })
    if (page > 1) qs.set("page", String(page))
    return qs.size ? `${path}?${qs}` : path
  }

  return (
    <div className="content-container py-6 small:py-10">
      {/* Filtered / sorted / paged URLs: keep out of search results (canonical points to the clean page). */}
      {Object.values(searchParams).some((v) => v !== undefined && v !== "") && <meta name="robots" content="noindex, follow" />}
      <Breadcrumbs items={crumbs} origin={origin} />
      <h1 className="mt-3 font-serif text-3xl font-semibold text-primary small:text-4xl">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}

      <div className="mt-6">
        <FilterLayout
          facets={result.facets}
          filters={filters}
          hide={hide}
          total={result.total}
          activeCount={activeCount}
        >
          {result.products.length ? (
            <>
              <h2 className="sr-only">Products</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 xsmall:grid-cols-3 medium:grid-cols-4">
                {result.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-champagne bg-ivory-deep px-6 py-12 text-center">
              <p className="font-serif text-2xl font-semibold text-primary">No products found</p>
              <p className="mt-2 text-sm text-ink-soft">
                {hasActiveFilters(filters)
                  ? "Nothing matches these filters. Try removing one."
                  : "Products for this page are on their way. Please check back soon."}
              </p>
              <LocalizedClientLink
                href={hasActiveFilters(filters) ? path : "/shop"}
                className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {hasActiveFilters(filters) ? "Clear filters" : "Browse all products"}
              </LocalizedClientLink>
            </div>
          )}

          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                <LocalizedClientLink
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === result.page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    n === result.page ? "bg-primary text-white" : "border border-champagne text-ink hover:border-primary"
                  }`}
                >
                  {n}
                </LocalizedClientLink>
              ))}
            </nav>
          )}
        </FilterLayout>
      </div>
    </div>
  )
}
