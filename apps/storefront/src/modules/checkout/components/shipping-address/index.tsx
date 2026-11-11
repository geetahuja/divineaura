"use client"

import { HttpTypes } from "@medusajs/types"
import { mapKeys } from "lodash"
import { useEffect, useState } from "react"
import AddressFields, { field, labelCls } from "../address-fields"
import AddressSelect from "../address-select"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const KEYS = ["first_name", "last_name", "address_1", "address_2", "postal_code", "city", "province", "phone"] as const

const fromAddress = (a?: HttpTypes.StoreCartAddress | null) =>
  Object.fromEntries(
    KEYS.map((k) => [`shipping_address.${k}`, k === "phone" ? (a?.phone ?? "").replace(/^\+91/, "") : (a?.[k] as string) ?? ""])
  )

// Contact first (mobile required, email optional — ARCHITECTURE.md §9), then the delivery address.
export default function ShippingAddress({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) {
  // Logged in with a saved default address → pre-filled (the customer can still change it).
  const defaultAddress = customer?.addresses?.find((a) => a.is_default_shipping && a.country_code === "in")
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...fromAddress(cart?.shipping_address ?? (defaultAddress as unknown as HttpTypes.StoreCartAddress | undefined)),
    email: cart?.email || customer?.email || "",
  }))
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }))

  useEffect(() => {
    if (cart?.shipping_address) {
      setValues((v) => ({ ...v, ...fromAddress(cart.shipping_address), email: cart.email || v.email }))
    }
  }, [cart?.shipping_address, cart?.email])

  const saved = customer?.addresses.filter((a) => a.country_code === "in") ?? []

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
        <legend className="mb-3 text-base font-semibold text-ink">Contact</legend>
        <div>
          <label htmlFor="shipping-phone" className={labelCls}>Mobile number</label>
          <div className="flex">
            <span className="flex h-12 items-center rounded-l-md border border-r-0 border-champagne bg-ivory-deep px-3 text-ink-soft">+91</span>
            <input
              id="shipping-phone"
              name="shipping_address.phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              pattern="[6-9][0-9]{9}"
              title="10-digit mobile number"
              maxLength={10}
              required
              value={values["shipping_address.phone"]}
              onChange={(e) => set("shipping_address.phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={`${field} rounded-l-none`}
            />
          </div>
          <p className="mt-1 text-xs text-ink-muted">For order updates and delivery.</p>
        </div>
        <div>
          <label htmlFor="shipping-email" className={labelCls}>
            Email <span className="font-normal text-ink-muted">(optional, recommended)</span>
          </label>
          <input
            id="shipping-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className={field}
          />
          <p className="mt-1 text-xs text-ink-muted">For your order confirmation and invoice.</p>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-base font-semibold text-ink">Delivery address</legend>
        {!customer && (
          <p className="mb-4 text-sm text-ink-soft">
            Have an account?{" "}
            <LocalizedClientLink href="/account?next=/checkout" className="font-semibold text-primary underline-offset-2 hover:underline">
              Log in to use saved addresses
            </LocalizedClientLink>{" "}
            — or just continue as a guest.
          </p>
        )}
        {customer && saved.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-ink-soft">Hi{customer.first_name ? ` ${customer.first_name}` : ""}, use a saved address?</p>
            <AddressSelect
              addresses={saved}
              addressInput={mapKeys(values, (_, k) => k.replace("shipping_address.", "")) as unknown as HttpTypes.StoreCartAddress}
              onSelect={(a) => a && setValues((v) => ({ ...v, ...fromAddress(a) }))}
            />
          </div>
        )}
        <AddressFields prefix="shipping_address" values={values} onChange={set} />
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-primary"
        />
        Billing address is the same as the delivery address
      </label>
    </div>
  )
}
