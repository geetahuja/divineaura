import { Category, categoryHref, categoryTrail, listCatalogue, listCategories } from "@lib/data/catalogue"
import type { FullProduct } from "@lib/data/product"
import { parseTag } from "@lib/slug"
import { getSiteOrigin } from "@lib/util/site"
import Breadcrumbs from "@modules/listing/breadcrumbs"
import ProductCard from "@modules/listing/product-card"
import { getPublicPaymentSettings } from "@lib/data/payment-options"
import { convertToLocale } from "@lib/util/money"
import { Banknote, Globe, RotateCcw } from "lucide-react"
import ProductReviews from "@modules/reviews/product-reviews"
import TrackEvent from "@modules/consent/track-event"
import { getPricedVariants } from "@lib/util/product-structured-data"
import type { ReviewPage } from "@lib/data/reviews"
import HeartButton from "@modules/wishlist/heart-button"
import { getStorePolicies } from "@lib/data/store-policies"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"
import BuyBox from "./buy-box"
import ProductDetails from "./details"
import Gallery from "./gallery"
import PincodeChecker from "./pincode-checker"

const RELATED_COUNT = 4

// Same deity first, then same category, then same top-level category (e.g. any
// bracelet), then newest to fill the row. Never the product itself.
async function related(product: FullProduct, categories: Category[]) {
  const all = (await listCatalogue()).filter((p) => p.id !== product.id)
  const deities = (product.tags ?? []).map((t) => t.value).filter((v) => parseTag(v)?.kind === "deity")
  const cats = new Set((product.categories ?? []).map((c) => c.id))
  const rootOf = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? categoryTrail(c, categories)[0].id : null
  }
  const roots = new Set(Array.from(cats).map(rootOf))
  const score = (p: (typeof all)[number]) =>
    (p.tags.some((t) => deities.includes(t)) ? 4 : 0) +
    (p.category_ids.some((id) => cats.has(id)) ? 2 : 0) +
    (p.category_ids.some((id) => roots.has(rootOf(id))) ? 1 : 0)
  return all
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || b.p.created_at.localeCompare(a.p.created_at))
    .slice(0, RELATED_COUNT)
    .map((x) => x.p)
}

export default async function ProductTemplate({ product, reviews }: { product: FullProduct; reviews: ReviewPage }) {
  const [categories, origin, payments, policies] = await Promise.all([listCategories(), getSiteOrigin(), getPublicPaymentSettings(), getStorePolicies(DEFAULT_COUNTRY_CODE)])
  const returnDays = policies.current?.returnWindowDays ?? 7
  const fromPrice = Math.min(...getPricedVariants(product).map((v) => v.calculated_price!.calculated_amount!), Infinity)
  const fromPriceSafe = Number.isFinite(fromPrice) ? fromPrice : 0
  const relatedProducts = await related(product, categories)

  const primary = categories.find((c) => c.id === product.categories?.[0]?.id)
  const trail = primary ? categoryTrail(primary, categories) : []
  const isBracelet =
    trail[0]?.handle === "bracelets" || (product.options ?? []).some((o) => /bracelet size/i.test(o.title ?? ""))
  const media = (product.images ?? []).map((i) => i.url).filter(Boolean)
  if (!media.length && product.thumbnail) media.push(product.thumbnail)

  return (
    <div className="content-container pb-12 pt-4 small:pb-20 small:pt-8">
      <Breadcrumbs
        origin={origin}
        items={[
          { label: "Shop", href: "/shop" },
          ...trail.map((c) => ({ label: c.name, href: categoryHref(c, categories) })),
          { label: product.title, href: `/products/${product.handle}` },
        ]}
      />

      {/* minmax(0,1fr) + min-w-0: the swipe track must not widen the column past 375 px. */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-8 small:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] small:gap-12">
        <div className="min-w-0 small:sticky small:top-40 small:self-start">
          <Gallery media={media} title={product.title} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div>
            {product.collection && (
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">{product.collection.title}</p>
            )}
            <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight text-primary small:text-4xl">
              {product.title}
            </h1>
            {product.subtitle && <p className="mt-1 text-ink-soft">{product.subtitle}</p>}
          </div>
          <BuyBox product={product} showSizeGuide={isBracelet} />
          <TrackEvent event={{ name: "view_item", value: fromPriceSafe, items: [{ item_id: product.id, item_name: product.title, price: fromPriceSafe, quantity: 1 }] }} />
          <HeartButton productId={product.id} title={product.title} variant="page" />
          <p className="-mt-2 flex items-center gap-2 text-sm text-ink-soft" data-testid="return-policy">
            <RotateCcw className="h-4 w-4 text-accent" aria-hidden />
            {product.product_specs?.not_returnable ? (
              <span><span className="font-semibold text-ink">Not returnable</span> once delivered (sacred items that can&apos;t be resold once opened).</span>
            ) : (
              <span>Easy returns within {returnDays} days of delivery</span>
            )}
          </p>
          {/* Required on every product page (Consumer Protection (E-Commerce) Rules 2020). */}
          <p className="-mt-2 flex items-center gap-2 text-sm text-ink-soft" data-testid="country-of-origin">
            <Globe className="h-4 w-4 text-accent" aria-hidden />
            <span>
              Country of origin:{" "}
              <span className="font-semibold text-ink">{(product.product_specs?.country_of_origin as string | undefined) || "to be confirmed – please ask us"}</span>
            </span>
          </p>
          {payments?.cod_enabled && (
            <p className="-mt-2 flex items-center gap-2 text-sm text-ink-soft">
              <Banknote className="h-4 w-4 text-accent" aria-hidden />
              Cash on Delivery available on orders up to{" "}
              {convertToLocale({ amount: payments.cod_max_order_value, currency_code: "inr" })}
              {payments.prepaid_discount_percent > 0 && <> · {payments.prepaid_discount_percent}% off when you pay online</>}
            </p>
          )}
          <PincodeChecker />
          <ProductDetails specs={product.product_specs ?? null} description={product.description} />
        </div>
      </div>

      <ProductReviews productId={product.id} initial={reviews} />

      {relatedProducts.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-14">
          <h2 id="related-heading" className="font-serif text-3xl font-semibold text-primary">You may also like</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
