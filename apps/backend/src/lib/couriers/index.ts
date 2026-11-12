import type { MedusaContainer } from "@medusajs/framework/types"
import { SHIPPING_MODULE } from "../../modules/shipping"
import type ShippingModuleService from "../../modules/shipping/service"
import { testToolsAllowed } from "../site-mode"
import { ManualCourier } from "./manual"
import { ShiprocketCourier } from "./shiprocket"
import { TestCourier } from "./test"
import type { Courier, CourierId } from "./types"

export type { Courier, CourierId, CourierOption, Serviceability, ShipmentInput, ShipmentResult, TrackingEvent } from "./types"

export const COURIER_LABEL: Record<CourierId, string> = { shiprocket: "Shiprocket", manual: "Manual courier", test: "Test courier" }

let envCouriers: Partial<Record<"shiprocket" | "test", Courier>> | undefined

/** API couriers configured in .env: Shiprocket (EMAIL + PASSWORD), test (staging/dev + secret). */
function fromEnv() {
  if (envCouriers) return envCouriers
  const e = process.env
  envCouriers = {}
  if (e.SHIPROCKET_EMAIL && e.SHIPROCKET_PASSWORD) {
    envCouriers.shiprocket = new ShiprocketCourier({
      email: e.SHIPROCKET_EMAIL,
      password: e.SHIPROCKET_PASSWORD,
      pickupNickname: e.SHIPROCKET_PICKUP_LOCATION || "Primary",
      webhookToken: e.SHIPROCKET_WEBHOOK_TOKEN || "",
      webhookHeader: e.SHIPROCKET_WEBHOOK_HEADER || "x-api-key",
    })
  }
  if (testToolsAllowed() && e.TEST_COURIER_WEBHOOK_SECRET) {
    envCouriers.test = new TestCourier(e.TEST_COURIER_WEBHOOK_SECRET, (e.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, ""))
  }
  return envCouriers
}

const shipping = (c: MedusaContainer) => c.resolve<ShippingModuleService>(SHIPPING_MODULE)

/** Couriers usable right now. The manual courier is always available. */
export function availableCourierIds(): CourierId[] {
  const env = fromEnv()
  return [...(env.shiprocket ? (["shiprocket"] as const) : []), "manual", ...(env.test ? (["test"] as const) : [])]
}

export function courierById(c: MedusaContainer, id: string | null | undefined): Courier | null {
  if (id === "manual") {
    return new ManualCourier({ pincode: (pin) => shipping(c).manualPincode(pin), settings: () => shipping(c).getCourierSettings() })
  }
  return id === "shiprocket" || id === "test" ? fromEnv()[id] ?? null : null
}

/** The default courier from Admin → Shipping & couriers ("auto": Shiprocket → test → manual). */
export async function defaultCourierId(c: MedusaContainer): Promise<CourierId> {
  const chosen = (await shipping(c).getCourierSettings()).default_courier
  const available = availableCourierIds()
  if (chosen !== "auto" && available.includes(chosen as CourierId)) return chosen as CourierId
  return available.includes("shiprocket") ? "shiprocket" : available.includes("test") ? "test" : "manual"
}

/** Courier used for delivery checks, checkout COD checks and new shipments unless overridden. */
export async function getCourier(c: MedusaContainer): Promise<Courier> {
  return courierById(c, await defaultCourierId(c))!
}

export const shippingDefaults = () => ({
  itemGrams: Number(process.env.SHIPPING_DEFAULT_ITEM_WEIGHT_G) || 50,
  packagingGrams: Number(process.env.SHIPPING_PACKAGING_WEIGHT_G) || 50,
})
