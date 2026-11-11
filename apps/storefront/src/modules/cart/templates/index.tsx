import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import EmptyCartMessage from "../components/empty-cart-message"
import ItemsTemplate from "./items"
import Summary from "./summary"

export default function CartTemplate({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart?.items?.length) {
    return (
      <div className="content-container py-12">
        <EmptyCartMessage />
      </div>
    )
  }

  return (
    <div className="content-container py-6 small:py-12" data-testid="cart-container">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 small:grid-cols-[minmax(0,1fr)_380px] small:gap-12">
        <div className="min-w-0">
          <ItemsTemplate cart={cart} />
          {!customer && (
            <p className="mt-4 text-sm text-ink-soft">
              Have an account?{" "}
              <LocalizedClientLink href="/account" className="font-semibold text-primary hover:underline" data-testid="sign-in-button">
                Sign in
              </LocalizedClientLink>{" "}
              to check out faster.
            </p>
          )}
        </div>
        {cart.region && (
          <div className="small:sticky small:top-28 small:self-start">
            <div className="rounded-lg border border-champagne bg-white p-5">
              <Summary cart={cart} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
