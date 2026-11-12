"use client"

import { checkDelivery, DeliveryCheck } from "@lib/data/delivery"
import { deliveryBy } from "@lib/util/delivery-date"
import { MapPin } from "lucide-react"
import { useState, useTransition } from "react"
import { notServiceableText } from "@lib/util/delivery-text"

function message(r: DeliveryCheck) {
  switch (r.status) {
    case "invalid":
      return { ok: false, text: "Please enter a valid 6-digit PIN code." }
    case "unavailable":
      return { ok: false, text: "Delivery checks are coming soon. We deliver across India." }
    case "not_serviceable":
      return { ok: false, text: notServiceableText(r) }
    case "serviceable":
      return {
        ok: true,
        text: `Delivery by ${deliveryBy(r.etaDays.max)}${r.city ? ` to ${r.city}` : r.state ? ` in ${r.state}` : ""}. ${r.cod ? "Cash on Delivery available." : "Cash on Delivery isn't available here — pay online."}`,
      }
  }
}

export default function PincodeChecker() {
  const [pin, setPin] = useState("")
  const [result, setResult] = useState<DeliveryCheck | null>(null)
  const [pending, start] = useTransition()
  const m = result && message(result)

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
      {m && (
        <p role="status" className={`mt-2 text-sm ${m.ok ? "text-green-700" : "text-ink-soft"}`}>
          {m.text}
        </p>
      )}
    </form>
  )
}
