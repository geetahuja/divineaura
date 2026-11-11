import type { CatalogueProduct } from "@lib/data/catalogue"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import QuickAdd from "./quick-add"
import HeartButton from "@modules/wishlist/heart-button"

export const inr = (amount: number) => convertToLocale({ amount, currency_code: "inr" })

// Shown until the product has a photo: ivory card with a gold lotus line drawing.
const LotusPlaceholder = () => (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-ivory to-champagne/60">
    <svg viewBox="0 0 64 40" aria-hidden className="h-12 w-16 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M32 6c-5 7-5 18 0 28 5-10 5-21 0-28Z" />
      <path d="M32 34c-8-3-15-10-17-21 9 1 15 7 17 21Z" />
      <path d="M32 34c8-3 15-10 17-21-9 1-15 7-17 21Z" />
      <path d="M32 34C22 34 12 30 6 22c9-2 19 3 26 12Zm0 0c10 0 20-4 26-12-9-2-19 3-26 12Z" opacity=".6" />
    </svg>
  </div>
)

export default function ProductCard({ product, priority }: { product: CatalogueProduct; priority?: boolean }) {
  const discount = product.mrp && product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0

  return (
    <li className="flex flex-col">
      <LocalizedClientLink href={`/products/${product.handle}`} className="group flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-champagne bg-ivory-deep">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <LotusPlaceholder />
          )}
          <HeartButton productId={product.id} title={product.title} />
          {!product.in_stock && (
            <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
              Out of stock
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-primary">
          {product.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          {product.price != null ? (
            <>
              <span className="font-semibold text-ink">{inr(product.price)}</span>
              {product.mrp && (
                <>
                  <s className="text-xs text-ink-muted" aria-label={`MRP ${inr(product.mrp)}`}>
                    {inr(product.mrp)}
                  </s>
                  <span className="text-xs font-semibold text-green-700">{discount}% off</span>
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-ink-muted">Price on request</span>
          )}
        </div>
      </LocalizedClientLink>
      <QuickAdd handle={product.handle} variantId={product.single_variant_id} inStock={product.in_stock} />
    </li>
  )
}
