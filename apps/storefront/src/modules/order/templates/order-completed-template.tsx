import { Heading } from "@modules/common/components/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { getOrderCodStatus } from "@lib/data/cod-status"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"
  const cod = await getOrderCodStatus(order.id)

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex h-full w-full max-w-4xl flex-col gap-4 rounded-lg border border-champagne bg-white px-5 py-8 small:px-10"
          data-testid="order-complete-container"
        >
          <h1 className="font-serif text-3xl font-semibold text-primary small:text-4xl">
            Thank you! Your order is placed.
          </h1>
          <OrderDetails order={order} cod={cod} />
          <LocalizedClientLink href="/shop" className="text-sm font-semibold text-primary hover:underline">
            Continue shopping →
          </LocalizedClientLink>
          <Heading level="h2" className="mt-4 font-serif text-2xl font-semibold text-primary">
            Summary
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} cod={cod} />
          <Help />
        </div>
      </div>
    </div>
  )
}
