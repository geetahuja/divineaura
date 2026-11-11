import { timingSafeEqual } from "node:crypto"
import type { TimelineStatus } from "../shipping"
import type { Courier, Serviceability, TrackingEvent } from "./types"

/**
 * Shiprocket (https://apidocs.shiprocket.in). Switches on when SHIPROCKET_EMAIL
 * and SHIPROCKET_PASSWORD are set.
 *
 * UNTESTED against the live API (no account yet). Before go-live, verify with a
 * Shiprocket test shipment: field names in createShipment, the tracking status
 * strings below, and the webhook auth header (SHIPROCKET_WEBHOOK_HEADER, default
 * "x-api-key") + token (SHIPROCKET_WEBHOOK_TOKEN) set in Shiprocket → Settings → Webhooks.
 */
const BASE = "https://apiv2.shiprocket.in/v1/external"

// Shiprocket status text → our timeline. Anything else is ignored.
export function mapShiprocketStatus(raw: string): TimelineStatus | null {
  const s = raw.toUpperCase().replace(/[_-]/g, " ").trim()
  if (s.startsWith("RTO")) return "rto"
  if (s.includes("CANCEL")) return "cancelled"
  if (s === "DELIVERED") return "delivered"
  if (s.includes("OUT FOR DELIVERY")) return "out_for_delivery"
  if (["PICKED UP", "SHIPPED", "IN TRANSIT", "REACHED AT DESTINATION HUB", "PICKUP COMPLETED"].some((x) => s.includes(x))) return "shipped"
  return null
}

export class ShiprocketCourier implements Courier {
  id = "shiprocket" as const
  private token: { value: string; expires: number } | null = null

  constructor(
    private cfg: { email: string; password: string; pickupNickname: string; webhookToken: string; webhookHeader: string }
  ) {}

  private async auth() {
    if (this.token && this.token.expires > Date.now()) return this.token.value
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: this.cfg.email, password: this.cfg.password }),
    })
    if (!r.ok) throw new Error(`Shiprocket login failed (${r.status})`)
    const { token } = (await r.json()) as { token: string }
    this.token = { value: token, expires: Date.now() + 8 * 24 * 3600_000 } // tokens last 10 days
    return token
  }

  private async call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const r = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "content-type": "application/json", authorization: `Bearer ${await this.auth()}` },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    const json = (await r.json().catch(() => ({}))) as T
    if (!r.ok) throw new Error(`Shiprocket ${path} failed (${r.status}): ${JSON.stringify(json).slice(0, 300)}`)
    return json
  }

  async serviceability({ pickupPin, deliveryPin, weightGrams, cod }: { pickupPin: string; deliveryPin: string; weightGrams: number; cod: boolean }): Promise<Serviceability> {
    type R = { data?: { available_courier_companies?: { courier_company_id: number; courier_name: string; rate: number; estimated_delivery_days: string; cod: number }[]; recommended_courier_company_id?: number } }
    const q = new URLSearchParams({ pickup_postcode: pickupPin, delivery_postcode: deliveryPin, weight: String(weightGrams / 1000), cod: cod ? "1" : "0" })
    const r = await this.call<R>(`/courier/serviceability/?${q}`).catch(() => ({}) as R)
    const list = r.data?.available_courier_companies ?? []
    if (!list.length) return { serviceable: false, cod: false, etaDays: null, options: [], recommendedId: null }
    const options = list.map((c) => ({ id: String(c.courier_company_id), name: c.courier_name, rate: Number(c.rate), etaDays: Number(c.estimated_delivery_days) || 7, cod: c.cod === 1 }))
    const days = options.map((o) => o.etaDays)
    return {
      serviceable: true,
      cod: options.some((o) => o.cod),
      etaDays: { min: Math.min(...days), max: Math.max(...days) },
      options,
      recommendedId: r.data?.recommended_courier_company_id ? String(r.data.recommended_courier_company_id) : options[0].id,
    }
  }

  async lookupPincode(pin: string) {
    type R = { postcode_details?: { city?: string; state?: string } }
    const r = await this.call<R>(`/open/postcode/details?postcode=${pin}`).catch(() => null)
    return r?.postcode_details ? { city: r.postcode_details.city ?? null, state: r.postcode_details.state ?? null } : null
  }

  async createShipment(i: Parameters<Courier["createShipment"]>[0]) {
    const order = await this.call<{ order_id: number; shipment_id: number }>("/orders/create/adhoc", {
      method: "POST",
      body: {
        order_id: i.orderNumber,
        order_date: i.orderDate.toISOString().slice(0, 16).replace("T", " "),
        pickup_location: this.cfg.pickupNickname,
        billing_customer_name: i.to.name,
        billing_last_name: "",
        billing_address: i.to.address1,
        billing_address_2: i.to.address2 ?? "",
        billing_city: i.to.city,
        billing_pincode: i.to.pincode,
        billing_state: i.to.state,
        billing_country: "India",
        billing_email: i.to.email ?? "",
        billing_phone: i.to.phone.replace(/^\+91/, ""),
        shipping_is_billing: true,
        order_items: i.items.map((it) => ({ name: it.name, sku: it.sku, units: it.quantity, selling_price: it.unitPrice, hsn: it.hsn ?? "" })),
        payment_method: i.paymentMethod === "cod" ? "COD" : "Prepaid",
        sub_total: i.subTotal,
        length: 15,
        breadth: 10,
        height: 5,
        weight: i.weightGrams / 1000,
      },
    })
    const awb = await this.call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>("/courier/assign/awb", {
      method: "POST",
      body: { shipment_id: order.shipment_id, ...(i.courierId ? { courier_id: Number(i.courierId) } : {}) },
    })
    const code = awb.response?.data?.awb_code
    if (!code) throw new Error("Shiprocket did not assign an AWB")
    const label = await this.call<{ label_url?: string }>("/courier/generate/label", { method: "POST", body: { shipment_id: [order.shipment_id] } }).catch(() => ({}) as { label_url?: string })
    await this.call("/courier/generate/pickup", { method: "POST", body: { shipment_id: [order.shipment_id] } }).catch(() => null)
    return {
      shipmentId: String(order.shipment_id),
      awb: code,
      courierName: awb.response?.data?.courier_name ?? "Courier",
      labelUrl: label.label_url ?? null,
      trackingUrl: `https://shiprocket.co/tracking/${code}`,
    }
  }

  // TO VERIFY WITH A REAL TEST SHIPMENT: Shiprocket return order + AWB for the reverse pickup.
  async createReturnPickup(i: Parameters<Courier["createReturnPickup"]>[0]) {
    const order = await this.call<{ order_id: number; shipment_id: number }>("/orders/create/return", {
      method: "POST",
      body: {
        order_id: `R${i.orderNumber}-${i.returnId.slice(-6)}`,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_customer_name: i.from.name,
        pickup_address: i.from.address1,
        pickup_address_2: i.from.address2 ?? "",
        pickup_city: i.from.city,
        pickup_state: i.from.state,
        pickup_country: "India",
        pickup_pincode: i.from.pincode,
        pickup_phone: i.from.phone.replace(/^\+91/, ""),
        shipping_customer_name: i.to.name,
        shipping_address: i.to.address1,
        shipping_city: i.to.city,
        shipping_state: i.to.state,
        shipping_country: "India",
        shipping_pincode: i.to.pincode,
        shipping_phone: i.to.phone.replace(/^\+91/, ""),
        order_items: i.items.map((it) => ({ name: it.name, sku: it.sku, units: it.quantity, selling_price: it.unitPrice })),
        payment_method: "Prepaid",
        sub_total: i.items.reduce((a, it) => a + it.unitPrice * it.quantity, 0),
        length: 15,
        breadth: 10,
        height: 5,
        weight: i.weightGrams / 1000,
      },
    })
    const awb = await this.call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>("/courier/assign/awb", {
      method: "POST",
      body: { shipment_id: order.shipment_id, is_return: 1 },
    })
    const code = awb.response?.data?.awb_code
    if (!code) throw new Error("Shiprocket did not assign a return AWB")
    return { awb: code, courierName: awb.response?.data?.courier_name ?? "Courier", trackingUrl: `https://shiprocket.co/tracking/${code}` }
  }

  async track(awb: string): Promise<TrackingEvent[]> {
    type R = { tracking_data?: { shipment_track_activities?: { date: string; "sr-status-label"?: string; activity?: string }[] } }
    const r = await this.call<R>(`/courier/track/awb/${awb}`).catch(() => null)
    return (r?.tracking_data?.shipment_track_activities ?? [])
      .map((a) => ({ awb, status: mapShiprocketStatus(a["sr-status-label"] ?? a.activity ?? ""), at: new Date(a.date), eventId: `${awb}:${a.date}:${a["sr-status-label"] ?? a.activity}` }))
      .filter((e): e is TrackingEvent => !!e.status)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
  }

  verifyWebhook(headers: Record<string, unknown>) {
    const given = String(headers[this.cfg.webhookHeader.toLowerCase()] ?? "")
    const expected = this.cfg.webhookToken
    return !!expected && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  }

  parseWebhook(body: Record<string, unknown>) {
    const awb = String(body.awb ?? "")
    const raw = String(body.current_status ?? body.shipment_status ?? "")
    const status = mapShiprocketStatus(raw)
    if (!awb || !status) return null
    const at = body.current_timestamp ? new Date(String(body.current_timestamp)) : new Date()
    return { awb, status, at, eventId: `${awb}:${raw}:${body.current_timestamp ?? ""}` }
  }
}
