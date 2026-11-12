import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { availableCourierIds, courierById } from "../lib/couriers"
import { applyTrackingEvent, listEvents } from "../lib/shipments"
import { TERMINAL, TimelineStatus } from "../lib/shipping"
import { SHIPPING_MODULE } from "../modules/shipping"
import type ShippingModuleService from "../modules/shipping/service"

// Backup for missed tracking webhooks (ARCHITECTURE.md §10): every 30 minutes,
// asks the courier for each open shipment's events and applies new ones.
export default async function shippingTrackingSync(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  // Only couriers with a tracking API (the manual courier is updated by hand).
  for (const id of availableCourierIds().filter((x) => x !== "manual")) {
    const courier = courierById(container, id)!
    const shipments = await container.resolve<ShippingModuleService>(SHIPPING_MODULE).listShipments({ courier: courier.id }, { take: 500 })
    for (const s of shipments) {
      const done = (await listEvents(container, s.order_id)).some((e) => TERMINAL.includes(e.status as TimelineStatus))
      if (done) continue
      try {
        for (const ev of await courier.track(s.awb)) await applyTrackingEvent(container, ev, "sync")
      } catch (e) {
        logger.warn(`tracking sync failed for ${s.awb}: ${(e as Error).message}`)
      }
    }
  }
}

export const config = { name: "shipping-tracking-sync", schedule: "*/30 * * * *" }
