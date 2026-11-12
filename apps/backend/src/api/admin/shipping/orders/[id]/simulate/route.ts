import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { simulateNextTrackingEvent } from "../../../../../../lib/shipments"
import { testToolsAllowed } from "../../../../../../lib/site-mode"
import type { SimulateTrackingBody } from "../../../../../validators"

// STAGING / DEVELOPMENT (test courier only): sends the next tracking event as a signed webhook.
export async function POST(req: AuthenticatedMedusaRequest<SimulateTrackingBody>, res: MedusaResponse) {
  if (!testToolsAllowed()) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Not found")
  res.json(await simulateNextTrackingEvent(req.scope, req.params.id, req.validatedBody.status))
}
