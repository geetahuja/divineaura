import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { issueCreditNote, loadDocOrder, payments } from "./invoices"
import { notifyOrder } from "./notify"
import { recordEvent } from "./shipments"

/**
 * For every refund on the order made through the payment provider (admin
 * refund, or Medusa's cancel workflow — which refunds without emitting
 * payment.refunded): a credit note, "Refunded" on the timeline and the refund
 * message. Idempotent per refund, so it's safe to call from several events.
 * Return refunds (idempotency key "return:…") are settled by refundReturn().
 */
export async function settleRefunds(c: MedusaContainer, orderId: string) {
  const o = await loadDocOrder(c, orderId)
  if (!o) return
  const refunds = payments(o)
    .flatMap((p) => p.refunds ?? [])
    .filter((r) => !r.idempotency_key?.startsWith("return:"))
  for (const r of refunds) {
    const amount = Number(r.amount)
    await issueCreditNote(c, { orderId, sourceKey: `refund:${r.id}`, amount, reason: o.status === "canceled" ? "Order cancelled – refund" : "Refund" }).catch((e) =>
      c.resolve(ContainerRegistrationKeys.LOGGER).error(`credit note for refund ${r.id}: ${(e as Error).message}`)
    )
    await recordEvent(c, orderId, "refunded", "payment", { notify: false })
    await notifyOrder(c, "refund_processed", orderId, { amount: amount.toLocaleString("en-IN") }, { dedupeKey: `refund_processed:${r.id}` })
  }
}
