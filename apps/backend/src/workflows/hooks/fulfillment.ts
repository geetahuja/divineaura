import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import { COD_PROVIDER_ID } from "../../lib/cod"
import { COD_MODULE } from "../../modules/cod"
import type CodModuleService from "../../modules/cod/service"

/**
 * COD orders can't be fulfilled before they're confirmed — also when staff use
 * Medusa's native "Fulfill items" button instead of our "Create shipment".
 * Medusa 2.22 only offers a post-creation hook here; throwing rolls the
 * fulfillment back (workflow compensation).
 */
createOrderFulfillmentWorkflow.hooks.fulfillmentCreated(async ({ fulfillment }, { container }) => {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "payment_collections.payment_sessions.provider_id"],
    filters: { fulfillments: { id: fulfillment.id } } as never,
  })
  const order = data[0]
  const cod = order?.payment_collections?.some((pc) => pc?.payment_sessions?.some((s) => s?.provider_id === COD_PROVIDER_ID))
  if (!order || !cod) return
  const [c] = await container.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: order.id })
  if (c?.status !== "confirmed") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This Cash on Delivery order isn't confirmed yet.")
  }
})
