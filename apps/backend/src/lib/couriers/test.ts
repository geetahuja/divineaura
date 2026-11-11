import { createHmac, randomInt, timingSafeEqual } from "node:crypto"
import { isValidPin, stateFromPin, TimelineStatus } from "../shipping"
import type { Courier, Serviceability } from "./types"

/**
 * DEVELOPMENT-ONLY courier with deterministic rules, so every case can be tried:
 *  - PIN codes starting with 9 (army/field post) → not serviceable
 *  - PIN codes ending in 99 → serviceable, but no Cash on Delivery
 *  - same first digit as the pickup PIN → 2–4 days, otherwise 4–7 days
 * Tracking events arrive as HMAC-signed webhooks from Admin → "Simulate next
 * tracking event", exactly like a real courier's webhooks.
 */
export const TEST_COURIER_SIGNATURE_HEADER = "x-test-courier-signature"
export const signTestCourier = (secret: string, raw: string) => createHmac("sha256", secret).update(raw).digest("hex")

export function testServiceability(pickupPin: string, deliveryPin: string): Serviceability {
  if (!isValidPin(deliveryPin) || deliveryPin.startsWith("9")) {
    return { serviceable: false, cod: false, etaDays: null, options: [], recommendedId: null }
  }
  const near = pickupPin[0] === deliveryPin[0]
  const cod = !deliveryPin.endsWith("99")
  const options = [
    { id: "test-surface", name: "Test Surface", rate: near ? 45 : 60, etaDays: near ? 4 : 7, cod },
    { id: "test-express", name: "Test Express", rate: near ? 70 : 95, etaDays: near ? 2 : 4, cod },
  ]
  return { serviceable: true, cod, etaDays: near ? { min: 2, max: 4 } : { min: 4, max: 7 }, options, recommendedId: "test-surface" }
}

export class TestCourier implements Courier {
  id = "test" as const
  constructor(private secret: string, private backendUrl: string) {}

  async serviceability({ pickupPin, deliveryPin }: { pickupPin: string; deliveryPin: string }) {
    return testServiceability(pickupPin, deliveryPin)
  }

  async lookupPincode(pin: string) {
    return isValidPin(pin) ? { city: null, state: stateFromPin(pin) } : null
  }

  async createShipment(input: Parameters<Courier["createShipment"]>[0]) {
    const awb = `TEST${Date.now().toString().slice(-8)}${randomInt(10, 99)}`
    const option = testServiceability(input.pickup.pincode, input.to.pincode).options.find((o) => o.id === input.courierId) ?? null
    return {
      shipmentId: `test_${awb}`,
      awb,
      courierName: option?.name ?? "Test Surface",
      labelUrl: `${this.backendUrl}/admin/shipping/test-label/${awb}`,
      trackingUrl: null,
    }
  }

  async track() {
    return [] // events come through the (simulated) webhook
  }

  verifyWebhook(headers: Record<string, unknown>, raw: string) {
    const given = String(headers[TEST_COURIER_SIGNATURE_HEADER] ?? "")
    const expected = signTestCourier(this.secret, raw)
    return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  }

  parseWebhook(body: Record<string, unknown>) {
    const { awb, status, event_id, at } = body as { awb?: string; status?: TimelineStatus; event_id?: string; at?: string }
    return awb && status && event_id ? { awb, status, eventId: event_id, at: at ? new Date(at) : new Date() } : null
  }
}
