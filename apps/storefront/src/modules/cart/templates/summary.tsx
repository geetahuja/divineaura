"use client"

import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { getRegionPolicies } from "@lib/util/store-policies"
import { unavailableItems } from "@lib/util/cart-availability"
import UnavailableItems from "@modules/cart/components/unavailable-items"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Truck } from "lucide-react"

// Mobile number is the required contact (email is optional), so it marks the first step done.
function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.shipping_address?.phone) return "address"
  if (!cart.shipping_methods?.length) return "delivery"
  return "payment"
}

// Free-shipping hint from the region's policy (Admin → Regions → metadata); the
// actual shipping charge is always computed by the backend.
function FreeShippingProgress({ cart }: { cart: HttpTypes.StoreCart }) {
  const threshold = getRegionPolicies(cart.region)?.freeShippingThreshold
  if (threshold == null) return null
  const total = Number(cart.item_total ?? 0)
  const left = threshold - total
  const pct = Math.min(100, Math.round((total / threshold) * 100))
  return (
    <div className="rounded-lg border border-champagne bg-ivory-deep p-3">
      <p className="flex items-center gap-2 text-sm text-ink">
        <Truck className="h-4 w-4 text-accent" aria-hidden />
        {left > 0 ? (
          <span>
            Add <strong>{convertToLocale({ amount: left, currency_code: cart.currency_code })}</strong> more for free shipping
          </span>
        ) : (
          <span><strong>You get free shipping</strong> on this order</span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-champagne" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Summary({ cart }: { cart: HttpTypes.StoreCart }) {
  const unavailable = unavailableItems(cart)
  return (
    <div className="flex flex-col gap-y-4">
      <h2 className="font-serif text-3xl font-semibold text-primary">Order summary</h2>
      <UnavailableItems items={unavailable} />
      <FreeShippingProgress cart={cart} />
      <DiscountCode cart={cart} />
      <CartTotals totals={cart} />
      {unavailable.length === 0 && (
        <LocalizedClientLink
          href={"/checkout?step=" + getCheckoutStep(cart)}
          data-testid="checkout-button"
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-hover"
        >
          Proceed to checkout
        </LocalizedClientLink>
      )}
    </div>
  )
}
