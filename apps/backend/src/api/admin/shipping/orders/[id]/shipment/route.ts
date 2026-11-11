import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createShipment } from "../../../../../../lib/shipments"
import type { CreateShipmentBody } from "../../../../../validators"

// "Create shipment": courier_id omitted = the courier's recommended option.
export async function POST(req: AuthenticatedMedusaRequest<CreateShipmentBody>, res: MedusaResponse) {
  res.json({ shipment: await createShipment(req.scope, req.params.id, req.validatedBody.courier_id ?? null) })
}
