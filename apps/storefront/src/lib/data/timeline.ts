"use server"

import { sdk } from "@lib/config"

export type TimelineEvent = { status: string; occurred_at: string }
export type TimelineShipment = { courier_name: string | null; awb: string; tracking_url: string | null } | null
export type TrackResult =
  | { found: false }
  | {
      found: true
      order: { display_id: number; placed_at: string; city: string; items: { title: string; quantity: number }[] }
      events: TimelineEvent[]
      shipment: TimelineShipment
    }

export async function getOrderTimeline(orderId: string) {
  return sdk.client
    .fetch<{ events: TimelineEvent[]; shipment: TimelineShipment }>(`/store/orders/${orderId}/timeline`, { cache: "no-store" })
    .catch(() => ({ events: [], shipment: null }))
}

// /track-order: order number + checkout mobile number.
export async function trackOrder(_prev: TrackResult | null, form: FormData): Promise<TrackResult> {
  const order_number = String(form.get("order_number") ?? "").replace(/\D/g, "")
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "")
  if (!order_number || phone.length < 10) return { found: false }
  return sdk.client
    .fetch<TrackResult>("/store/track", { method: "POST", body: { order_number: Number(order_number), phone } })
    .catch(() => ({ found: false }) as TrackResult)
}
