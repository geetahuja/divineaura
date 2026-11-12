import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createShipment } from "../../../../../../lib/shipments"
import type { CreateShipmentBody } from "../../../../../validators"

// "Create shipment": provider omitted = default courier (Admin → Shipping & couriers);
// courier_id omitted = that courier's recommended option; manual = AWB typed by the admin.
export async function POST(req: AuthenticatedMedusaRequest<CreateShipmentBody>, res: MedusaResponse) {
  const b = req.validatedBody
  res.json({ shipment: await createShipment(req.scope, req.params.id, b.courier_id ?? null, { provider: b.provider ?? null, manual: b.manual ?? null }) })
}
