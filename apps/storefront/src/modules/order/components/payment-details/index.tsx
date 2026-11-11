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

export const paymentStatusLabel = (status?: string) =>
  STATUS[status ?? ""] ?? { label: "Awaiting payment", tone: "bg-champagne text-ink" }

export default function PaymentDetails({ order }: { order: HttpTypes.StoreOrder }) {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const status = paymentStatusLabel(order.payment_status)
  const adapter = getPaymentAdapter(payment?.provider_id)

  return (
    <section aria-labelledby="payment-details-heading" className="py-6">
      <h2 id="payment-details-heading" className="font-serif text-2xl font-semibold text-primary">Payment</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        {payment && (
          <span className="flex items-center gap-2 text-ink-soft">
            {adapter?.icon}
            {adapter?.title ?? "Online payment"} ·{" "}
            {convertToLocale({ amount: Number(payment.amount), currency_code: order.currency_code })}
          </span>
        )}
      </div>
      {order.payment_status === "authorized" && (
        <p className="mt-2 text-xs text-ink-muted">
          Your payment was received. Confirmation from the payment provider usually takes a few seconds.
        </p>
      )}
    </section>
  )
}
