import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { listEvents } from "../../../lib/shipments"
import { SHIPPING_MODULE } from "../../../modules/shipping"
import type ShippingModuleService from "../../../modules/shipping/service"
import type { TrackOrderBody } from "../../validators"

const digits = (s: string) => s.replace(/\D/g, "").slice(-10)

/**
 * /track-order: order number + the mobile number used at checkout. The same
 * "not found" answer for a wrong number or a wrong mobile, so it can't be used
 * to discover orders. ponytail: rate-limit this route in Nginx (ARCHITECTURE.md §14).
 */
export async function POST(req: MedusaRequest<TrackOrderBody>, res: MedusaResponse) {
  const { order_number, phone } = req.validatedBody
  const { data } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "display_id", "created_at", "status", "shipping_address.phone", "shipping_address.city", "items.product_title", "items.quantity", "items.metadata"],
    filters: { display_id: order_number as unknown as string }, // numeric column; filter type says string
  })
  const order = data[0]
  if (!order || !order.shipping_address?.phone || digits(order.shipping_address.phone) !== digits(phone)) {
    return res.status(404).json({ found: false })
  }
  const [s] = await req.scope.resolve<ShippingModuleService>(SHIPPING_MODULE).listShipments({ order_id: order.id })
  res.json({
    found: true,
    order: {
      display_id: order.display_id,
      placed_at: order.created_at,
      city: order.shipping_address.city,
      items: (order.items ?? []).filter((i) => i?.metadata?.type !== "cod_fee").map((i) => ({ title: i!.product_title, quantity: i!.quantity })),
    },
    events: (await listEvents(req.scope, order.id)).map((e) => ({ status: e.status, occurred_at: e.occurred_at })),
    shipment: s ? { courier_name: s.courier_name, awb: s.awb, tracking_url: s.tracking_url } : null,
  })
}
