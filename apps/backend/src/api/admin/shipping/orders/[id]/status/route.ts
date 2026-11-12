import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateManualStatus } from "../../../../../../lib/shipments"
import type { TimelineStatus } from "../../../../../../lib/shipping"
import type { ManualStatusBody } from "../../../../../validators"

// Manual courier: admin sets the next status (customer gets the usual message).
export async function POST(req: AuthenticatedMedusaRequest<ManualStatusBody>, res: MedusaResponse) {
  const b = req.validatedBody
  res.json(await updateManualStatus(req.scope, req.params.id, b.status as TimelineStatus, b.tracking_url === undefined ? undefined : b.tracking_url))
}
