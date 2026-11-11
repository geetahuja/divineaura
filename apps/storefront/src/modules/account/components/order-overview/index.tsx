import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OrderCard from "../order-card"

export default function OrderOverview({ orders }: { orders: HttpTypes.StoreOrder[] }) {
  if (orders?.length) {
    return (
      <ul className="flex w-full flex-col gap-4">
        {orders.map((o) => (
          <li key={o.id}>
            <OrderCard order={o} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-champagne bg-white p-6" data-testid="no-orders-container">
      <p className="font-serif text-xl font-semibold text-primary">No orders yet</p>
      <p className="text-sm text-ink-soft">Orders you place with this mobile number will appear here.</p>
      <LocalizedClientLink href="/shop" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-hover" data-testid="continue-shopping-button">
        Start shopping
      </LocalizedClientLink>
    </div>
  )
}
