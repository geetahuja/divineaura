"use client"

import { getPaymentAdapter } from "@lib/payments"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

const link = "font-semibold text-primary underline-offset-2 hover:underline"

export default function Review({ cart }: { cart: HttpTypes.StoreCart }) {
  const isOpen = useSearchParams().get("step") === "review"
  const [accepted, setAccepted] = useState(false)

  const session = cart.payment_collection?.payment_sessions?.find((s) => s.status === "pending")
  const adapter = getPaymentAdapter(session?.provider_id)
  const ready =
    !!cart.shipping_address?.phone && !!cart.shipping_address && (cart.shipping_methods?.length ?? 0) > 0 && !!adapter

  return (
    <section aria-labelledby="review-heading" className="rounded-lg border border-champagne bg-white p-5 small:p-6">
      <h2 id="review-heading" className={`font-serif text-2xl font-semibold text-primary ${!isOpen ? "opacity-50" : ""}`}>
        4. Review &amp; place order
      </h2>
      {isOpen && ready && adapter && (
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              I have read and agree to the{" "}
              <LocalizedClientLink href="/policies/terms" target="_blank" className={link}>Terms of use</LocalizedClientLink>,{" "}
              <LocalizedClientLink href="/policies/shipping" target="_blank" className={link}>Shipping</LocalizedClientLink>,{" "}
              <LocalizedClientLink href="/policies/cancellation" target="_blank" className={link}>Cancellation</LocalizedClientLink> and{" "}
              <LocalizedClientLink href="/policies/returns-refunds" target="_blank" className={link}>Returns</LocalizedClientLink> policies and the{" "}
              <LocalizedClientLink href="/policies/privacy" target="_blank" className={link}>Privacy policy</LocalizedClientLink>.
            </span>
          </label>
          <adapter.PayButton cart={cart} providerId={session!.provider_id} disabled={!accepted} />
          <p className="text-xs text-ink-muted">
            Prices are inclusive of all taxes. Your order is confirmed once the payment is verified.
          </p>
        </div>
      )}
    </section>
  )
}
