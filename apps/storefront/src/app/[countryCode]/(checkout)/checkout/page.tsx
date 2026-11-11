import { retrieveCart } from "@lib/data/cart"
import { itemsFromLines } from "@lib/util/analytics-items"
import TrackEvent from "@modules/consent/track-event"
import { retrieveCustomer } from "@lib/data/customer"
import { unavailableItems } from "@lib/util/cart-availability"
import UnavailableItems from "@modules/cart/components/unavailable-items"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()
  const unavailable = unavailableItems(cart)

  return (
    <div className="content-container grid grid-cols-1 gap-8 py-8 small:grid-cols-[minmax(0,1fr)_400px] small:gap-12 small:py-12">
      {/* Medusa refuses cart updates while unavailable items remain, so resolve that first. */}
      {unavailable.length ? <UnavailableItems items={unavailable} /> : <CheckoutForm cart={cart} customer={customer} />}
      <CheckoutSummary cart={cart} />
      <TrackEvent event={{ name: "begin_checkout", value: Number(cart.total ?? 0), items: itemsFromLines(cart.items) }} />
    </div>
  )
}
