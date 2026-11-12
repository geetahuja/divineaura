"use client"

import { initiatePaymentSession } from "@lib/data/cart"
import { useState } from "react"
import type { PayButtonProps } from "./index"

type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
type RzpInstance = { open: () => void; on: (ev: "payment.failed", cb: () => void) => void }
type RzpCtor = new (o: Record<string, unknown>) => RzpInstance

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

function loadCheckout(): Promise<RzpCtor> {
  const w = window as unknown as { Razorpay?: RzpCtor }
  if (w.Razorpay) return Promise.resolve(w.Razorpay)
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT
    s.async = true
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay did not load")))
    s.onerror = () => reject(new Error("Could not reach Razorpay. Check your connection and try again."))
    document.body.appendChild(s)
  })
}

/**
 * Razorpay Checkout (UPI, cards, net banking, wallets). A fresh payment session
 * per attempt = a fresh Razorpay order created by the backend, which also hands
 * back the public key id (no build-time env). After paying, the customer goes to
 * /api/payment-return; the backend checks with Razorpay before creating the order,
 * and only the verified webhook marks it Paid.
 */
export default function RazorpayPayButton({ cart, providerId, disabled }: PayButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      const [Razorpay, { payment_collection }] = await Promise.all([loadCheckout(), initiatePaymentSession(cart, { provider_id: providerId })])
      const session = payment_collection?.payment_sessions?.find((s) => s.provider_id === providerId)
      const d = (session?.data ?? {}) as { key_id?: string; razorpay_order_id?: string; amount_paise?: number }
      if (!session || !d.key_id || !d.razorpay_order_id) throw new Error("Could not start the payment. Please try again.")
      const a = cart.shipping_address
      const back = (reason: string) => window.location.assign(`/checkout?step=payment&payment_error=${reason}`)
      const rzp = new Razorpay({
        key: d.key_id,
        order_id: d.razorpay_order_id,
        amount: d.amount_paise,
        currency: "INR",
        name: "DivineAura",
        description: "Order payment",
        prefill: { name: [a?.first_name, a?.last_name].filter(Boolean).join(" "), email: cart.email ?? "", contact: a?.phone ?? "" },
        theme: { color: "#762019" },
        handler: (_r: RzpResponse) => window.location.assign(`/api/payment-return?cart_id=${encodeURIComponent(cart.id)}`),
        modal: { ondismiss: () => back("cancelled") },
      })
      rzp.on("payment.failed", () => undefined) // Razorpay shows the error and lets the customer retry inside the popup
      rzp.open()
      setBusy(false)
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
        {busy ? "Opening payment…" : "Pay securely and place order"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  )
}
