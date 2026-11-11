"use client"

import { setAddresses } from "@lib/data/cart"
import useToggleState from "@lib/hooks/use-toggle-state"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { CheckCircle2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import BillingAddress from "../billing_address"
import ShippingAddress from "../shipping-address"

const Submit = () => {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-full bg-primary px-8 text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50 small:self-start"
    >
      {pending ? "Saving…" : "Continue to delivery"}
    </button>
  )
}

const oneLine = (a: HttpTypes.StoreCartAddress) =>
  [a.address_1, a.address_2, a.city, a.province, a.postal_code].filter(Boolean).join(", ")

export default function Addresses({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isOpen = useSearchParams().get("step") === "address"
  const { state: sameAsBilling, toggle } = useToggleState(
    cart?.shipping_address && cart?.billing_address ? compareAddresses(cart.shipping_address, cart.billing_address) : true
  )
  const [message, formAction] = useActionState(setAddresses, null)
  const a = cart?.shipping_address

  return (
    <section aria-labelledby="address-heading" className="rounded-lg border border-champagne bg-white p-5 small:p-6">
      <div className="flex items-center justify-between">
        <h2 id="address-heading" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
          1. Contact &amp; address
          {!isOpen && a && <CheckCircle2 className="h-5 w-5 text-green-700" aria-label="Completed" />}
        </h2>
        {!isOpen && a && (
          <button type="button" onClick={() => router.push(`${pathname}?step=address`)} className="text-sm font-semibold text-primary hover:underline">
            Change
          </button>
        )}
      </div>

      {isOpen ? (
        <form action={formAction} className="mt-4 flex flex-col gap-6">
          <ShippingAddress customer={customer} cart={cart} checked={sameAsBilling} onChange={toggle} />
          {!sameAsBilling && (
            <fieldset>
              <legend className="mb-3 text-base font-semibold text-ink">Billing address</legend>
              <BillingAddress cart={cart} />
            </fieldset>
          )}
          {message && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p>
          )}
          <Submit />
        </form>
      ) : (
        a && (
          <div className="mt-3 grid gap-3 text-sm text-ink-soft small:grid-cols-2">
            <div>
              <p className="font-semibold text-ink">{[a.first_name, a.last_name].filter(Boolean).join(" ")}</p>
              <p>{oneLine(a)}</p>
            </div>
            <div>
              <p>{a.phone}</p>
              {cart?.email && <p>{cart.email}</p>}
              {!sameAsBilling && cart?.billing_address && <p className="mt-1">Billing: {oneLine(cart.billing_address)}</p>}
            </div>
          </div>
        )
      )}
    </section>
  )
}
