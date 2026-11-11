import type { OrderCodStatus } from "@lib/data/cod-status"
import { getPaymentAdapter } from "@lib/payments"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

// Order payment_status → what the customer sees. "authorized" means the gateway
// confirmed the payment but its webhook hasn't been processed yet (seconds).
const STATUS: Record<string, { label: string; tone: string }> = {
  captured: { label: "Paid", tone: "bg-green-700 text-white" },
  authorized: { label: "Confirming payment", tone: "bg-accent-soft text-ink" },
  partially_refunded: { label: "Partially refunded", tone: "bg-accent-soft text-ink" },
  refunded: { label: "Refunded", tone: "bg-champagne text-ink" },
  canceled: { label: "Cancelled", tone: "bg-champagne text-ink" },
}

const COD: Record<NonNullable<OrderCodStatus>["status"], { label: string; tone: string }> = {
  pending: { label: "Cash on Delivery · Pending confirmation", tone: "bg-accent-soft text-ink" },
  confirmed: { label: "Cash on Delivery · Confirmed", tone: "bg-green-700 text-white" },
  cancelled: { label: "Cash on Delivery · Cancelled", tone: "bg-champagne text-ink" },
}

export const paymentStatusLabel = (status?: string, cod?: OrderCodStatus) => {
  if (cod) return status === "captured" ? STATUS.captured : COD[cod.status]
  return STATUS[status ?? ""] ?? { label: "Awaiting payment", tone: "bg-champagne text-ink" }
}

export default function PaymentDetails({ order, cod }: { order: HttpTypes.StoreOrder; cod?: OrderCodStatus }) {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const status = paymentStatusLabel(order.payment_status, cod)
  const adapter = getPaymentAdapter(payment?.provider_id)

  return (
    <section aria-labelledby="payment-details-heading" className="py-6">
      <h2 id="payment-details-heading" className="font-serif text-2xl font-semibold text-primary">Payment</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        {payment && (
          <span className="flex items-center gap-2 text-ink-soft">
            {adapter?.icon}
            {cod ? "Pay on delivery" : adapter?.title ?? "Online payment"} ·{" "}
            {convertToLocale({ amount: Number(cod ? order.total : payment.amount), currency_code: order.currency_code })}
          </span>
        )}
      </div>
      {cod?.status === "pending" && (
        <p className="mt-2 text-sm text-ink-soft">
          Please confirm your order with the link we sent to your mobile number before{" "}
          {new Date(cod.expires_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Unconfirmed
          Cash on Delivery orders are cancelled automatically.
        </p>
      )}
      {!cod && order.payment_status === "authorized" && (
        <p className="mt-2 text-xs text-ink-muted">
          Your payment was received. Confirmation from the payment provider usually takes a few seconds.
        </p>
      )}
    </section>
  )
}
