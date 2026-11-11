import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_MODULE } from "../../../../../modules/cod"
import type CodModuleService from "../../../../../modules/cod/service"

// COD confirmation for one order (admin order page widget). null = not a COD order.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const [confirmation] = await req.scope.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: req.params.id })
  res.json({ confirmation: confirmation ?? null })
}
