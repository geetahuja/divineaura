"use server"

import { sdk } from "@lib/config"

// PIN-code delivery check (ARCHITECTURE.md §5.9), answered by the backend's
// courier layer (default courier from Admin → Shipping & couriers). COD = courier
// offers it AND the PIN isn't on the COD blocklist AND COD is switched on.
export type DeliveryCheck =
  | { status: "invalid" }
  | { status: "unavailable" } // no courier configured yet
  | { status: "serviceable"; etaDays: { min: number; max: number }; cod: boolean; city: string | null; state: string | null }
  | { status: "not_serviceable"; reason?: "outside_state"; seller_state?: string; city?: string | null; state?: string | null }

export async function checkDelivery(pin: string): Promise<DeliveryCheck> {
  if (!/^[1-9]\d{5}$/.test(pin.trim())) {
    return { status: "invalid" }
  }
  return sdk.client
    .fetch<DeliveryCheck>("/store/delivery-check", { query: { pincode: pin.trim() }, cache: "no-store" })
    .catch(() => ({ status: "unavailable" }) as DeliveryCheck)
}
