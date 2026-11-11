"use client"

import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { CheckCircle2, Truck } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

// Delivery options come from Medusa (prices and the free-above-threshold rule are
// computed on the server). "calculated" options (e.g. Shiprocket, milestone 8)
// are priced per cart through calculatePriceForShippingOption.
export default function Shipping({
  cart,
  availableShippingMethods,
}: {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isOpen = useSearchParams().get("step") === "delivery"
  const options = availableShippingMethods ?? []
  const current = cart.shipping_methods?.at(-1)
  const [selected, setSelected] = useState(current?.shipping_option_id ?? options[0]?.id ?? "")
  const [calculated, setCalculated] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    options
      .filter((o) => o.price_type === "calculated")
      .forEach((o) =>
        calculatePriceForShippingOption(o.id, cart.id).then((r) => {
          if (r?.amount != null) setCalculated((c) => ({ ...c, [o.id]: r.amount! }))
        })
      )
  }, [cart.id, options])

  const price = (o: HttpTypes.StoreCartShippingOption) => {
    const amount = o.price_type === "calculated" ? calculated[o.id] : o.amount
    if (amount == null) return "Calculating…"
    return amount === 0 ? "Free" : convertToLocale({ amount, currency_code: cart.currency_code })
  }

  const go = (step: string) => router.push(`${pathname}?step=${step}`, { scroll: false })

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (current?.shipping_option_id !== selected) {
        await setShippingMethod({ cartId: cart.id, shippingMethodId: selected })
      }
      go("payment")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="delivery-heading" className="rounded-lg border border-champagne bg-white p-5 small:p-6">
      <div className="flex items-center justify-between">
        <h2 id="delivery-heading" className={`flex items-center gap-2 font-serif text-2xl font-semibold text-primary ${!isOpen && !current ? "opacity-50" : ""}`}>
          2. Delivery
          {!isOpen && current && <CheckCircle2 className="h-5 w-5 text-green-700" aria-label="Completed" />}
        </h2>
        {!isOpen && current && cart.shipping_address && (
          <button type="button" onClick={() => go("delivery")} className="text-sm font-semibold text-primary hover:underline">
            Change
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-3">
          {options.length === 0 && (
            <p className="text-sm text-ink-soft">Sorry, we can't deliver to this address yet. Please check the PIN code.</p>
          )}
          {options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${selected === o.id ? "border-primary bg-ivory" : "border-champagne"}`}
            >
              <input type="radio" name="shipping_option" checked={selected === o.id} onChange={() => setSelected(o.id)} className="h-4 w-4 accent-primary" />
              <Truck className="h-5 w-5 text-accent" aria-hidden />
              <span className="flex-1 font-semibold text-ink">{o.name}</span>
              <span className="font-semibold text-ink">{price(o)}</span>
            </label>
          ))}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={!selected || busy}
            className="mt-2 h-12 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50 small:self-start"
          >
            {busy ? "Saving…" : "Continue to payment"}
          </button>
        </div>
      )}

      {!isOpen && current && (
        <p className="mt-3 text-sm text-ink-soft">
          {current.name} ·{" "}
          {current.amount === 0 ? "Free" : convertToLocale({ amount: Number(current.amount), currency_code: cart.currency_code })}
        </p>
      )}
    </section>
  )
}
