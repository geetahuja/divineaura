import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { parsePinList } from "../../../../lib/shipping"
import { SHIPPING_MODULE } from "../../../../modules/shipping"
import type ShippingModuleService from "../../../../modules/shipping/service"
import type { ManualPincodesBody } from "../../../validators"

const svc = (req: AuthenticatedMedusaRequest) => req.scope.resolve<ShippingModuleService>(SHIPPING_MODULE)

// Manual courier PIN lists as text (one per line) for the bulk-edit boxes.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const rows = await svc(req).listManualPincodes({}, { select: ["pincode", "cod"], order: { pincode: "ASC" }, take: null })
  res.json({ serviceable: rows.map((r) => r.pincode).join("\n"), cod: rows.filter((r) => r.cod).map((r) => r.pincode).join("\n"), count: rows.length })
}

// Replaces both lists. COD PINs must also be serviceable (otherwise rejected, nothing saved).
export async function POST(req: AuthenticatedMedusaRequest<ManualPincodesBody>, res: MedusaResponse) {
  const serviceable = parsePinList(req.validatedBody.serviceable)
  const cod = parsePinList(req.validatedBody.cod)
  const bad = [...serviceable.invalid, ...cod.invalid]
  if (bad.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Not valid 6-digit PIN codes: ${bad.slice(0, 10).join(", ")}${bad.length > 10 ? "…" : ""}`)
  const set = new Set(serviceable.valid)
  const stray = cod.valid.filter((p) => !set.has(p))
  if (stray.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, `COD PIN codes must also be in the delivery list: ${stray.slice(0, 10).join(", ")}${stray.length > 10 ? "…" : ""}`)
  const count = await svc(req).replaceManualPincodes(serviceable.valid, new Set(cod.valid))
  res.json({ serviceable: count, cod: cod.valid.length })
}
