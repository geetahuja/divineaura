import { getOrderCodStatus } from "@lib/data/cod-status"
import { getOrderActions } from "@lib/data/order-actions"
import { getOrderTimeline } from "@lib/data/timeline"
import { getReviewableItems } from "@lib/data/reviews"
import OrderReviews from "@modules/reviews/order-reviews"
import { HttpTypes } from "@medusajs/types"
import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderActions from "@modules/order/components/order-actions"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import OrderTimeline from "@modules/order/components/timeline"
import { ChevronLeft } from "lucide-react"

// Account → order: status, timeline, invoice, cancel / return, items, address, totals.
export default async function OrderDetailsTemplate({ order }: { order: HttpTypes.StoreOrder }) {
  const [cod, timeline, actions, reviewItems] = await Promise.all([
    getOrderCodStatus(order.id),
    getOrderTimeline(order.id),
    getOrderActions(order.id),
    getReviewableItems(order.id),
  ])
  return (
    <div className="flex flex-col gap-y-4">
      <LocalizedClientLink href="/account/orders" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-primary" data-testid="back-to-overview-button">
        <ChevronLeft className="h-4 w-4" aria-hidden /> All orders
      </LocalizedClientLink>
      <h1 className="font-serif text-3xl font-semibold text-primary">Order #{order.display_id}</h1>
      <div className="flex w-full flex-col gap-4" data-testid="order-details-container">
        <OrderDetails order={order} cod={cod} />
        <OrderActions orderId={order.id} actions={actions} />
        <OrderTimeline events={timeline.events} shipment={timeline.shipment} />
        <OrderReviews orderId={order.id} items={reviewItems} />
        <Items order={order} />
        <ShippingDetails order={order} />
        <CartTotals totals={order} />
        <Help />
      </div>
    </div>
  )
}
