import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_MODULE } from "../../../../modules/cod"
import type CodModuleService from "../../../../modules/cod/service"

// COD orders awaiting confirmation, oldest first (for phone confirmations).
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const pending = await req.scope
    .resolve<CodModuleService>(COD_MODULE)
    .listCodConfirmations({ status: "pending" }, { order: { created_at: "ASC" }, take: 200 })
  const ids = pending.map((c) => c.order_id)
  const { data: orders } = ids.length
    ? await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
        entity: "order",
        fields: ["id", "display_id", "total", "created_at", "email", "shipping_address.first_name", "shipping_address.last_name", "shipping_address.phone", "shipping_address.city", "shipping_address.postal_code"],
        filters: { id: ids },
      })
    : { data: [] }
  const byId = new Map(orders.map((o) => [o.id, o]))
  res.json({
    queue: pending.map((c) => ({ ...c, order: byId.get(c.order_id) ?? null })),
  })
}
