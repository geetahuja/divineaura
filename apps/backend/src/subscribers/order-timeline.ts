import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { recordEvent } from "../lib/shipments"

/**
 * Order timeline (ARCHITECTURE.md §5.8): Placed when the order is created,
 * Confirmed when an online payment is captured (COD: confirmCodOrder), Cancelled
 * when the order is cancelled. Packed / Shipped / … come from the shipping flow.
 */
export default async function orderTimeline({ event, container }: SubscriberArgs<{ id: string }>) {
  if (event.name === "order.placed") return void (await recordEvent(container, event.data.id, "placed", "order"))
  if (event.name === "order.canceled") return void (await recordEvent(container, event.data.id, "cancelled", "order"))

  // payment.captured → the payment's order. COD captures happen at delivery, so skip those.
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "payment",
    fields: ["provider_id", "payment_collection.order.id"],
    filters: { id: event.data.id },
  })
  const p = data[0] as { provider_id?: string; payment_collection?: { order?: { id?: string } } } | undefined
  const orderId = p?.payment_collection?.order?.id
  if (orderId && p?.provider_id !== "pp_cod_cod") await recordEvent(container, orderId, "confirmed", "payment")
}

export const config: SubscriberConfig = { event: ["order.placed", "order.canceled", "payment.captured"] }
