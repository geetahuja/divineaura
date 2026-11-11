import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyOrder } from "../lib/notify"

// Refund message (ARCHITECTURE.md §10) — one per refund, not one per order.
export default async function refundProcessed({ event, container }: SubscriberArgs<{ id: string }>) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "payment",
    fields: ["refunds.id", "refunds.amount", "refunds.created_at", "payment_collection.order.id"],
    filters: { id: event.data.id },
  })
  const p = data[0] as { refunds?: { id: string; amount: number; created_at: string }[]; payment_collection?: { order?: { id: string } } } | undefined
  const refund = [...(p?.refunds ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  const orderId = p?.payment_collection?.order?.id
  if (!refund || !orderId) return
  await notifyOrder(container, "refund_processed", orderId, { amount: Number(refund.amount).toLocaleString("en-IN") }, { dedupeKey: `refund_processed:${refund.id}` })
}

export const config: SubscriberConfig = { event: "payment.refunded" }
