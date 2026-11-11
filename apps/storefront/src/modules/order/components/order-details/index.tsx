import type { OrderCodStatus } from "@lib/data/cod-status"
import { HttpTypes } from "@medusajs/types"
import { paymentStatusLabel } from "../payment-details"

// Order number, date, payment status and where updates go (ARCHITECTURE.md §9.6).
// Messages are sent by the messaging layer (milestone 9); nothing here claims they already were.
export default function OrderDetails({ order, showStatus, cod }: { order: HttpTypes.StoreOrder; showStatus?: boolean; cod?: OrderCodStatus }) {
  const phone = order.shipping_address?.phone
  const contacts = [phone, order.email].filter(Boolean).join(" and ")
  const payment = paymentStatusLabel(order.payment_status, cod)

  return (
    <div className="flex flex-col gap-2 text-sm text-ink-soft">
      <p className="text-base text-ink">
        Order number <span className="font-semibold text-primary" data-testid="order-id">#{order.display_id}</span>
      </p>
      <p>
        Placed on{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </p>
      <p className="flex items-center gap-2">
        Payment:
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${payment.tone}`}>{payment.label}</span>
      </p>
      {showStatus && (
        <p>
          Order status: <span className="text-ink">{order.fulfillment_status.replace(/_/g, " ")}</span>
        </p>
      )}
      {contacts && <p>Order updates will be sent to <span className="font-semibold text-ink">{contacts}</span>.</p>}
    </div>
  )
}
