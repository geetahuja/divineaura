"use client"

import { EcommerceEvent, track, trackPurchaseOnce } from "@lib/analytics"
import { useEffect } from "react"

// Fires one analytics event when the page shows (no-op until analytics consent + IDs).
// GA/Pixel may load a moment after consent, so wait briefly for them.
export default function TrackEvent({ event }: { event: EcommerceEvent }) {
  const key = JSON.stringify(event)
  useEffect(() => {
    const fire = () => (event.name === "purchase" ? trackPurchaseOnce(event) : track(event))
    const t = setTimeout(fire, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}
