"use client"

import { placeOrder } from "@lib/data/cart"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { useState } from "react"
import type { PayButtonProps } from "./index"

// Places the COD order directly (the server re-checks eligibility and the fee).
export default function CodPayButton({ disabled }: PayButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const place = async () => {
    setBusy(true)
    setError(null)
    try {
      await placeOrder() // redirects to the confirmation page on success
      notifyCartUpdated()
    } catch (e) {
      // Next's redirect() also throws; only real errors leave a message.
      const message = (e as Error).message
      if (!/NEXT_REDIRECT/.test(message)) setError(message)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={place}
        disabled={disabled || busy}
        className="h-12 w-full rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "Placing order…" : "Place order (Cash on Delivery)"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  )
}
