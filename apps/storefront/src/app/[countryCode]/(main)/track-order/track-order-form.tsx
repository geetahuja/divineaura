"use client"

import { trackOrder } from "@lib/data/timeline"
import OrderTimeline from "@modules/order/components/timeline"
import { useActionState } from "react"

const field = "h-12 w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"

export default function TrackOrderForm() {
  const [result, action, pending] = useActionState(trackOrder, null)

  return (
    <div className="w-full max-w-lg">
      <h1 className="font-serif text-3xl font-semibold text-primary small:text-4xl">Track your order</h1>
      <p className="mt-2 text-ink-soft">Enter your order number and the mobile number you used at checkout.</p>
      <form action={action} className="mt-6 grid gap-4 rounded-lg border border-champagne bg-white p-5 xsmall:grid-cols-2">
        <div>
          <label htmlFor="order_number" className="mb-1 block text-sm font-semibold text-ink">Order number</label>
          <input id="order_number" name="order_number" inputMode="numeric" placeholder="e.g. 1024" required className={field} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-ink">Mobile number</label>
          <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={13} required className={field} />
        </div>
        <button disabled={pending} className="h-12 rounded-full bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-50 xsmall:col-span-2">
          {pending ? "Checking…" : "Track order"}
        </button>
      </form>

      {result && !result.found && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          We couldn&apos;t find an order with that number and mobile number. Please check both and try again.
        </p>
      )}
      {result?.found && (
        <div className="mt-6 rounded-lg border border-champagne bg-white px-5">
          <p className="pt-5 text-sm text-ink-soft">
            Order <span className="font-semibold text-primary">#{result.order.display_id}</span> ·{" "}
            {result.order.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")}
          </p>
          <OrderTimeline events={result.events} shipment={result.shipment} />
        </div>
      )}
    </div>
  )
}
