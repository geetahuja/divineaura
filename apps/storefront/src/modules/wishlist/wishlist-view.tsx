"use client"

import { addToCart } from "@lib/data/cart"
import type { CatalogueProduct } from "@lib/data/catalogue"
import { getWishlistProducts } from "@lib/data/wishlist"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart } from "lucide-react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useWishlist } from "./context"

const inr = (n: number) => convertToLocale({ amount: n, currency_code: "inr" })
const btn = "flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"

// /wishlist: saved products with Move to cart / Remove; out-of-stock shown clearly.
export default function WishlistView() {
  const w = useWishlist()
  const countryCode = useParams().countryCode as string
  const [products, setProducts] = useState<CatalogueProduct[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = w.ids.join(",")

  useEffect(() => {
    if (!w.ready) return
    let live = true
    getWishlistProducts(w.ids).then((p) => live && setProducts(p))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w.ready])

  async function moveToCart(p: CatalogueProduct) {
    setBusy(p.id)
    setError(null)
    try {
      await addToCart({ variantId: p.single_variant_id!, quantity: 1, countryCode })
      notifyCartUpdated()
      w.remove(p.id)
    } catch {
      setError(`Couldn't add ${p.title} to your cart. Please try again.`)
    }
    setBusy(null)
  }

  if (!w.ready || products === null) return <p className="text-ink-soft">Loading your wishlist…</p>

  if (!products.length) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-champagne bg-white p-6">
        <Heart className="h-8 w-8 text-accent" aria-hidden />
        <p className="font-serif text-xl font-semibold text-primary">Your wishlist is empty</p>
        <p className="text-sm text-ink-soft">Tap the heart on any product to save it here.</p>
        <LocalizedClientLink href="/shop" className={`${btn} bg-primary text-white hover:bg-primary-hover`}>Browse products</LocalizedClientLink>
      </div>
    )
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <ul className="grid gap-3">
        {products.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-lg border border-champagne bg-white p-3" data-testid="wishlist-item">
            <LocalizedClientLink href={`/products/${p.handle}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-champagne bg-ivory-deep">
              {p.thumbnail && <Image src={p.thumbnail} alt="" fill sizes="96px" className={`object-cover ${p.in_stock ? "" : "opacity-60"}`} />}
            </LocalizedClientLink>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <LocalizedClientLink href={`/products/${p.handle}`} className="line-clamp-2 text-sm font-medium text-ink hover:text-primary">{p.title}</LocalizedClientLink>
              <p className="text-sm">
                {p.price != null && <span className="font-semibold text-ink">{inr(p.price)}</span>}
                {p.mrp && <s className="ml-2 text-xs text-ink-muted">{inr(p.mrp)}</s>}
              </p>
              {!p.in_stock && <span className="self-start rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">Out of stock</span>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {p.in_stock && p.single_variant_id ? (
                  <button disabled={busy === p.id} onClick={() => moveToCart(p)} className={`${btn} bg-primary text-white hover:bg-primary-hover disabled:opacity-50`}>
                    {busy === p.id ? "Adding…" : "Move to cart"}
                  </button>
                ) : p.in_stock ? (
                  <LocalizedClientLink href={`/products/${p.handle}`} className={`${btn} border border-primary text-primary`}>Choose options</LocalizedClientLink>
                ) : null}
                <button onClick={() => w.remove(p.id)} className="px-2 text-sm font-semibold text-ink-soft hover:text-red-700" aria-label={`Remove ${p.title} from wishlist`}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
