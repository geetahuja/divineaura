import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_MODULE } from "../../../../../modules/cod"
import type CodModuleService from "../../../../../modules/cod/service"

// For the order confirmation page: is this a COD order and where is it in the
// confirmation flow? (Medusa doesn't return order metadata to the storefront.)
// The order id is the access key, as for Medusa's own GET /store/orders/:id.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [c] = await req.scope.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: req.params.id })
  res.json({
    cod: c ? { status: c.status, expires_at: c.expires_at, confirmed_by: c.confirmed_by } : null,
  })
}
