import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { settleRefunds } from "../lib/refunds"

// A refund through the payment provider → credit note + timeline + message (lib/refunds.ts).
export default async function refundProcessed({ event, container }: SubscriberArgs<{ id: string }>) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "payment",
    fields: ["payment_collection.order.id"],
    filters: { id: event.data.id },
  })
  const orderId = (data[0] as { payment_collection?: { order?: { id: string } } } | undefined)?.payment_collection?.order?.id
  if (orderId) await settleRefunds(container, orderId)
}

export const config: SubscriberConfig = { event: "payment.refunded" }
