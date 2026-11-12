import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { availableCourierIds, COURIER_LABEL, defaultCourierId } from "../../../../lib/couriers"
import { SHIPPING_MODULE } from "../../../../modules/shipping"
import type ShippingModuleService from "../../../../modules/shipping/service"
import type { CourierSettingsBody } from "../../../validators"

const svc = (req: AuthenticatedMedusaRequest) => req.scope.resolve<ShippingModuleService>(SHIPPING_MODULE)

async function view(req: AuthenticatedMedusaRequest) {
  const settings = await svc(req).getCourierSettings()
  const [serviceable, cod] = await Promise.all([svc(req).listManualPincodes({}, { select: ["id"], take: null }), svc(req).listManualPincodes({ cod: true }, { select: ["id"], take: null })])
  return {
    settings,
    couriers: availableCourierIds().map((id) => ({ id, label: COURIER_LABEL[id] })),
    effective_default: await defaultCourierId(req.scope),
    manual_pincodes: { serviceable: serviceable.length, cod: cod.length },
  }
}

// Admin → Shipping & couriers: default courier + manual courier details.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await view(req))
}

export async function POST(req: AuthenticatedMedusaRequest<CourierSettingsBody>, res: MedusaResponse) {
  const b = req.validatedBody
  if (b.default_courier && b.default_courier !== "auto" && !availableCourierIds().includes(b.default_courier)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `${COURIER_LABEL[b.default_courier]} is not configured on this server`)
  }
  const cur = await svc(req).getCourierSettings()
  const min = b.manual_eta_min ?? cur.manual_eta_min
  const max = b.manual_eta_max ?? cur.manual_eta_max
  if (max < min) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Maximum delivery days must be at least the minimum")
  await svc(req).updateCourierSettings({ id: cur.id, ...b })
  res.json(await view(req))
}
