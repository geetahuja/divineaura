"use client"

import { track } from "@lib/analytics"
import { itemsFromLines } from "@lib/util/analytics-items"

import { initiatePaymentSession } from "@lib/data/cart"
import { PaymentOptions, selectPaymentMethod } from "@lib/data/payment-options"
import { getPaymentAdapter, supportedProviders } from "@lib/payments"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { CheckCircle2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

const ERRORS: Record<string, string> = {
  failed: "Your payment did not go through and you have not been charged. Please try again or choose another method.",
  cancelled: "Payment was cancelled. Your cart is saved, so you can try again.",
  order_failed: "We could not confirm your payment yet. If money was deducted, it will be refunded or your order confirmed automatically. Please try again.",
}

export default function Payment({
  cart,
  availablePaymentMethods,
  options,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
  options: PaymentOptions | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get("step") === "payment"
  const paymentError = searchParams.get("payment_error")
  const inr = (n: number) => convertToLocale({ amount: n, currency_code: cart.currency_code })

  // COD is offered only when the server says the cart is eligible.
  const methods = supportedProviders(availablePaymentMethods).filter(
    (m) => getPaymentAdapter(m.id)!.kind !== "cod" || options?.cod.available
  )
  const codUnavailable =
    options && !options.cod.available && supportedProviders(availablePaymentMethods).some((m) => getPaymentAdapter(m.id)!.kind === "cod")
      ? options.cod.reason === "over_limit"
        ? `Cash on Delivery is available for orders up to ${inr(options.cod.max_order_value)}.`
        : options.cod.reason === "pincode_blocked"
          ? "Cash on Delivery isn't available for this PIN code yet."
          : options.cod.reason === "courier_no_cod"
          ? "Our courier doesn't collect cash at this PIN code, so please pay online."
          : null
      : null

  const activeSession = cart.payment_collection?.payment_sessions?.find((s) => s.status === "pending")
  const [selected, setSelected] = useState(
    methods.find((m) => m.id === activeSession?.provider_id)?.id ?? methods.find((m) => getPaymentAdapter(m.id)!.kind === "online")?.id ?? methods[0]?.id ?? ""
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shippingReady = (cart.shipping_methods?.length ?? 0) > 0
  const done = !!activeSession && shippingReady
  const chosen = getPaymentAdapter(activeSession?.provider_id)
  const go = (step: string) => router.push(`${pathname}?step=${step}`, { scroll: false })

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      // 1) Server prices the cart for this method (COD fee / prepaid discount),
      // 2) then the payment session is created on the new total.
      await selectPaymentMethod(cart.id, getPaymentAdapter(selected)!.kind)
      await initiatePaymentSession(cart, { provider_id: selected })
      track({ name: "add_payment_info", value: Number(cart.total ?? 0), payment_type: getPaymentAdapter(selected)!.kind, items: itemsFromLines(cart.items) })
      go("review")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const saving = options?.prepaid.saving ?? 0

  return (
    <section aria-labelledby="payment-heading" className="rounded-lg border border-champagne bg-white p-5 small:p-6">
      <div className="flex items-center justify-between">
        <h2 id="payment-heading" className={`flex items-center gap-2 font-serif text-2xl font-semibold text-primary ${!isOpen && !done ? "opacity-50" : ""}`}>
          3. Payment
          {!isOpen && done && <CheckCircle2 className="h-5 w-5 text-green-700" aria-label="Completed" />}
        </h2>
        {!isOpen && done && (
          <button type="button" onClick={() => go("payment")} className="text-sm font-semibold text-primary hover:underline">
            Change
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-3">
          {paymentError && ERRORS[paymentError] && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{ERRORS[paymentError]}</p>
          )}
          {methods.length === 0 && <p className="text-sm text-ink-soft">Payment is not available right now. Please try again later.</p>}
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Payment method</legend>
            {methods.map((m) => {
              const a = getPaymentAdapter(m.id)!
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${selected === m.id ? "border-primary bg-ivory" : "border-champagne"}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m.id}
                    checked={selected === m.id}
                    onChange={() => setSelected(m.id)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {a.icon}
                      {a.title}
                      {a.kind === "online" && saving > 0 && (
                        <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                          Save {inr(saving)} with online payment
                        </span>
                      )}
                      {a.kind === "cod" && options && options.cod.fee > 0 && (
                        <span className="rounded-full bg-champagne px-2 py-0.5 text-xs font-semibold text-ink">+{inr(options.cod.fee)} COD fee</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{a.description}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>
          {codUnavailable && <p className="text-sm text-ink-muted">{codUnavailable}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={!selected || !shippingReady || busy}
            className="mt-2 h-12 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50 small:self-start"
          >
            {busy ? "Saving…" : "Continue to review"}
          </button>
        </div>
      )}

      {!isOpen && done && chosen && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          {chosen.icon}
          {chosen.title}
        </p>
      )}
    </section>
  )
}
