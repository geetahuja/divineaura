"use client"

import { addToCart } from "@lib/data/cart"
import { track } from "@lib/analytics"
import { notifyCartUpdated } from "@lib/util/cart-events"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"
import { useState, useTransition } from "react"

const btn =
  "mt-2 flex h-9 w-full items-center justify-center rounded-full text-sm font-semibold transition-colors disabled:opacity-60"

// One-variant products go straight to the cart; others need options picked first.
export default function QuickAdd({
  handle,
  variantId,
  inStock,
  title,
  price,
}: {
  handle: string
  variantId: string | null
  inStock: boolean
  title: string
  price: number | null
}) {
  const countryCode = useParams().countryCode as string
  const [pending, start] = useTransition()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)

  if (!inStock) {
    return (
      <button type="button" disabled className={`${btn} border border-champagne text-ink-muted`}>
        Out of stock
      </button>
    )
  }
  if (!variantId) {
    return (
      <LocalizedClientLink
        href={`/products/${handle}`}
        className={`${btn} border border-primary text-primary hover:bg-primary hover:text-white`}
      >
        Choose options
      </LocalizedClientLink>
    )
  }
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false)
            try {
              await addToCart({ variantId, quantity: 1, countryCode })
              notifyCartUpdated()
              track({ name: "add_to_cart", value: price ?? 0, items: [{ item_id: variantId, item_name: title, price: price ?? 0, quantity: 1 }] })
              setAdded(true)
              setTimeout(() => setAdded(false), 2000)
            } catch {
              setError(true)
            }
          })
        }
        className={`${btn} bg-primary text-white hover:bg-primary-hover`}
      >
        {pending ? "Adding…" : added ? "Added ✓" : "Add to cart"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          Could not add. Please try again.
        </p>
      )}
    </>
  )
}
