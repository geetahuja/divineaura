"use client"

import { HttpTypes } from "@medusajs/types"
import { useState } from "react"
import AddressFields from "../address-fields"

const KEYS = ["first_name", "last_name", "address_1", "address_2", "postal_code", "city", "province"] as const

// Separate billing address (e.g. for a GST invoice). Uses the delivery mobile number.
export default function BillingAddress({ cart }: { cart: HttpTypes.StoreCart | null }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(KEYS.map((k) => [`billing_address.${k}`, (cart?.billing_address?.[k] as string) ?? ""]))
  )
  return (
    <AddressFields
      prefix="billing_address"
      values={values}
      onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
    />
  )
}
