import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelCodOrder } from "../lib/cod-orders"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"

/**
 * Cancels COD orders not confirmed within the window set in Admin → COD &
 * payments (default 24 h) and releases their stock. Runs every minute so short
 * test windows work; each run is a single indexed query when nothing is due.
 */
export default async function codAutoCancel(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const due = await container
    .resolve<CodModuleService>(COD_MODULE)
    .listCodConfirmations({ status: "pending", expires_at: { $lte: new Date() } }, { take: 50 })

  for (const c of due) {
    try {
      const r = await cancelCodOrder(container, c.order_id, "not confirmed in time")
      if (r.changed) logger.info(`COD auto-cancel: order #${r.order_display_id} cancelled (not confirmed in time)`)
    } catch (e) {
      logger.error(`COD auto-cancel failed for ${c.order_id}: ${(e as Error).message}`)
    }
  }
}

export const config = { name: "cod-auto-cancel", schedule: "* * * * *" }
