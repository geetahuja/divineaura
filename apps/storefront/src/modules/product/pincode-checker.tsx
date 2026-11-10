"use client"

import { checkDelivery, DeliveryCheck } from "@lib/data/delivery"
import { MapPin } from "lucide-react"
import { useState, useTransition } from "react"

const MESSAGES: Record<DeliveryCheck["status"], (r: DeliveryCheck) => string> = {
  invalid: () => "Please enter a valid 6-digit PIN code.",
  unavailable: () => "Delivery checks are coming soon. We deliver across India.",
  not_serviceable: () => "Sorry, we don't deliver to this PIN code yet.",
  serviceable: (r) => {
    const s = r as Extract<DeliveryCheck, { status: "serviceable" }>
    return `Delivery in ${s.etaDays.min}–${s.etaDays.max} days.${s.cod ? " Cash on delivery available." : ""}`
  },
}

export default function PincodeChecker() {
  const [pin, setPin] = useState("")
  const [result, setResult] = useState<DeliveryCheck | null>(null)
  const [pending, start] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => setResult(await checkDelivery(pin)))
      }}
      className="rounded-lg border border-champagne bg-ivory-deep p-4"
    >
      <label htmlFor="pincode" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MapPin className="h-4 w-4 text-accent" aria-hidden />
        Check delivery
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter PIN code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="h-11 min-w-0 flex-1 rounded-full border border-champagne bg-white px-4 text-base"
        />
        <button type="submit" disabled={pending || pin.length !== 6} className="h-11 rounded-full border border-primary px-5 text-sm font-semibold text-primary disabled:opacity-50">
          {pending ? "Checking…" : "Check"}
        </button>
      </div>
      {result && (
        <p role="status" className={`mt-2 text-sm ${result.status === "serviceable" ? "text-green-700" : "text-ink-soft"}`}>
          {MESSAGES[result.status](result)}
        </p>
      )}
    </form>
  )
}
