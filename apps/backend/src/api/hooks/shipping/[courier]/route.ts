import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { availableCourierIds, courierById } from "../../../../lib/couriers"
import { applyTrackingEvent } from "../../../../lib/shipments"

/**
 * Courier tracking webhook: /hooks/shipping/shiprocket (or /test on staging). The manual courier has none.
 * Verified (signature / token) before anything is applied; duplicates and
 * out-of-order events are ignored by the timeline rules, so retries are safe.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const id = req.params.courier
  const courier = availableCourierIds().includes(id as never) ? courierById(req.scope, id) : null
  const raw = (req as unknown as { rawBody?: Buffer | string }).rawBody?.toString() ?? ""
  if (!courier || !courier.verifyWebhook(req.headers as Record<string, unknown>, raw)) {
    logger.warn(`shipping webhook rejected (${req.params.courier})`)
    return res.status(401).json({ ok: false })
  }
  const event = courier.parseWebhook(req.body as Record<string, unknown>)
  if (!event) return res.json({ ok: true, ignored: true })
  const result = await applyTrackingEvent(req.scope, event, "webhook")
  res.json({ ok: true, ...result })
}
