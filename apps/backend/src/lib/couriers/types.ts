import type { TimelineStatus } from "../shipping"

// Pluggable couriers (ARCHITECTURE.md §2, §5.9): the rest of the app only uses
// this interface. "test" in development, "shiprocket" when its credentials are set.

export type CourierOption = { id: string; name: string; rate: number; etaDays: number; cod: boolean }

export type Serviceability = {
  serviceable: boolean
  cod: boolean
  etaDays: { min: number; max: number } | null
  options: CourierOption[]
  recommendedId: string | null
}

export type Address = { name: string; phone: string; email?: string | null; address1: string; address2?: string | null; city: string; state: string; pincode: string }

export type ShipmentInput = {
  orderNumber: string
  orderDate: Date
  paymentMethod: "cod" | "prepaid"
  total: number // amount to collect on COD / order value
  subTotal: number
  weightGrams: number
  pickup: Address & { nickname?: string | null }
  to: Address
  items: { name: string; sku: string; quantity: number; unitPrice: number; hsn?: string | null }[]
  courierId?: string | null
}

export type ShipmentResult = { shipmentId: string; awb: string; courierName: string; labelUrl: string | null; trackingUrl: string | null }

export type ReturnPickupInput = { orderNumber: string; returnId: string; from: Address; to: Address & { nickname?: string | null }; items: { name: string; sku: string; quantity: number; unitPrice: number }[]; weightGrams: number }
export type ReturnPickupResult = { awb: string; courierName: string; trackingUrl: string | null }

export type TrackingEvent = { awb: string; status: TimelineStatus; at: Date; eventId: string; note?: string }

export interface Courier {
  id: "test" | "shiprocket"
  serviceability(input: { pickupPin: string; deliveryPin: string; weightGrams: number; cod: boolean }): Promise<Serviceability>
  lookupPincode(pin: string): Promise<{ city: string | null; state: string | null } | null>
  createShipment(input: ShipmentInput): Promise<ShipmentResult>
  /** Reverse pickup from the customer back to the warehouse (approved returns). */
  createReturnPickup(input: ReturnPickupInput): Promise<ReturnPickupResult>
  track(awb: string): Promise<TrackingEvent[]>
  /** Verifies the tracking webhook (raw body + headers); false = reject. */
  verifyWebhook(headers: Record<string, unknown>, rawBody: string): boolean
  parseWebhook(body: Record<string, unknown>): TrackingEvent | null
}
