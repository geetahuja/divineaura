import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listEvents } from "../../../../../lib/shipments"
import { SHIPPING_MODULE } from "../../../../../modules/shipping"
import type ShippingModuleService from "../../../../../modules/shipping/service"

// Customer order timeline (order page). The order id is the access key, as for Medusa's own order route.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [s] = await req.scope.resolve<ShippingModuleService>(SHIPPING_MODULE).listShipments({ order_id: req.params.id })
  const events = await listEvents(req.scope, req.params.id)
  res.json({
    events: events.map((e) => ({ status: e.status, occurred_at: e.occurred_at })),
    shipment: s ? { courier_name: s.courier_name, awb: s.awb, tracking_url: s.tracking_url } : null,
  })
}
