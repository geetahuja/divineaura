"use client"

import { removeUnavailableItems } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useTransition } from "react"

// Shown on cart and checkout when an item can no longer be bought.
export default function UnavailableItems({ items }: { items: HttpTypes.StoreCartLineItem[] }) {
  const [pending, start] = useTransition()
  if (!items.length) return null
  return (
    <div role="alert" className="self-start rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">
        {items.length === 1 ? "An item in your cart is" : "Some items in your cart are"} no longer available:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {items.map((i) => (
          <li key={i.id}>{i.product_title || i.title}</li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => removeUnavailableItems())}
        className="mt-3 h-10 rounded-full bg-primary px-5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove and continue"}
      </button>
    </div>
  )
}
