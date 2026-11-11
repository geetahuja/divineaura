import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_MODULE } from "../../../modules/cod"
import type CodModuleService from "../../../modules/cod/service"

// Public subset for badges ("COD available") and copy. Eligibility per cart
// comes from /store/carts/:id/payment-options.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const s = await req.scope.resolve<CodModuleService>(COD_MODULE).getSettings()
  res.json({
    cod_enabled: s.cod_enabled,
    cod_fee: s.cod_fee,
    cod_max_order_value: s.cod_max_order_value,
    prepaid_discount_percent: s.prepaid_discount_percent,
  })
}
