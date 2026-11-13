import { MedusaError } from "@medusajs/framework/utils"
import { randomInt } from "node:crypto"
import { isValidPin, stateFromPin } from "../shipping"
import type { Courier, Serviceability } from "./types"

/** What the manual courier needs from the database (Admin → Shipping & couriers). */
export type ManualCourierStore = {
  pincode(pin: string): Promise<{ cod: boolean } | null>
  settings(): Promise<{ manual_courier_name?: string | null; manual_tracking_url?: string | null; manual_eta_min: number; manual_eta_max: number }>
}

export const trackingUrlFor = (template: string | null | undefined, awb: string) =>
  template && /^https?:\/\//.test(template) ? template.replace(/\{awb\}/g, encodeURIComponent(awb)) : null

/**
 * Own courier tie-up without an API. Serviceable / COD PIN codes come from the
 * editable list; the admin books the parcel with the courier, then enters the
 * courier name, AWB and tracking URL, and moves the status by hand. If the
 * courier later offers an API, add it as its own Courier (like shiprocket.ts).
 */
export class ManualCourier implements Courier {
  id = "manual" as const
  constructor(private store: ManualCourierStore) {}

  async serviceability({ deliveryPin }: { deliveryPin: string }): Promise<Serviceability> {
    const row = isValidPin(deliveryPin) ? await this.store.pincode(deliveryPin) : null
    if (!row) return { serviceable: false, cod: false, etaDays: null, options: [], recommendedId: null }
    const s = await this.store.settings()
    const name = s.manual_courier_name || "Our courier"
    return {
      serviceable: true,
      cod: row.cod,
      etaDays: { min: s.manual_eta_min, max: Math.max(s.manual_eta_min, s.manual_eta_max) },
      options: [{ id: "manual", name, rate: 0, etaDays: s.manual_eta_max, cod: row.cod }],
      recommendedId: "manual",
    }
  }

  async lookupPincode(pin: string) {
    return isValidPin(pin) ? { city: null, state: stateFromPin(pin) } : null
  }

  async createShipment(input: Parameters<Courier["createShipment"]>[0]) {
    const m = input.manual
    if (!m?.awb?.trim()) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter the courier's AWB / tracking number")
    const s = await this.store.settings()
    const courierName = m.courierName?.trim() || s.manual_courier_name || "Our courier"
    const trackingUrl = m.trackingUrl?.trim() || trackingUrlFor(s.manual_tracking_url, m.awb.trim())
    if (trackingUrl && !/^https?:\/\//.test(trackingUrl)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "The tracking link must start with https://")
    return { shipmentId: `manual_${m.awb.trim()}`, awb: m.awb.trim(), courierName, labelUrl: null, trackingUrl }
  }

  // Reverse pickup is arranged with the courier directly; the reference is shown to the customer.
  async createReturnPickup() {
    const s = await this.store.settings()
    return { awb: `RET-${Date.now().toString().slice(-6)}${randomInt(10, 99)}`, courierName: s.manual_courier_name || "Our courier", trackingUrl: null }
  }

  async track() {
    return [] // statuses are updated by hand in admin
  }
  verifyWebhook() {
    return false
  }
  parseWebhook() {
    return null
  }
}
