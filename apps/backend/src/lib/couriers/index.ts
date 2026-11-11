import { ShiprocketCourier } from "./shiprocket"
import { TestCourier } from "./test"
import type { Courier } from "./types"

export type { Courier, CourierOption, Serviceability, ShipmentInput, ShipmentResult, TrackingEvent } from "./types"

let cached: Courier | null | undefined

/**
 * Active courier: Shiprocket when SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD are
 * set; otherwise the test courier in development; otherwise none (production
 * without Shiprocket → delivery checks show "coming soon", shipments can't be created).
 */
export function getCourier(): Courier | null {
  if (cached !== undefined) return cached
  const e = process.env
  if (e.SHIPROCKET_EMAIL && e.SHIPROCKET_PASSWORD) {
    cached = new ShiprocketCourier({
      email: e.SHIPROCKET_EMAIL,
      password: e.SHIPROCKET_PASSWORD,
      pickupNickname: e.SHIPROCKET_PICKUP_LOCATION || "Primary",
      webhookToken: e.SHIPROCKET_WEBHOOK_TOKEN || "",
      webhookHeader: e.SHIPROCKET_WEBHOOK_HEADER || "x-api-key",
    })
  } else if (e.NODE_ENV !== "production" && e.TEST_COURIER_WEBHOOK_SECRET) {
    cached = new TestCourier(e.TEST_COURIER_WEBHOOK_SECRET, (e.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, ""))
  } else {
    cached = null
  }
  return cached
}

export const shippingDefaults = () => ({
  itemGrams: Number(process.env.SHIPPING_DEFAULT_ITEM_WEIGHT_G) || 50,
  packagingGrams: Number(process.env.SHIPPING_PACKAGING_WEIGHT_G) || 50,
})
