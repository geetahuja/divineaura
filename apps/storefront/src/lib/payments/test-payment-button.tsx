"use client"

import { initiatePaymentSession } from "@lib/data/cart"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { PayButtonProps } from "./index"

// Starts a fresh payment session per attempt (like a new gateway order after a
// failed try) and opens the development payment simulator.
export default function TestPayButton({ cart, providerId, disabled }: PayButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      const { payment_collection } = await initiatePaymentSession(cart, { provider_id: providerId })
      const session = payment_collection?.payment_sessions?.find((s) => s.provider_id === providerId)
      if (!session) throw new Error("Could not start the payment. Please try again.")
      router.push(`/checkout/test-payment?session=${encodeURIComponent(session.id)}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={pay}
        disabled={disabled || busy}
        className="h-12 w-full rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "Opening payment…" : "Pay and place order"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  )
}
