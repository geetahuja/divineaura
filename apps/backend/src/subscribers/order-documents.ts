import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { capturedAmount, getOrIssueInvoice, issueCreditNote, loadDocOrder } from "../lib/invoices"
import { settleRefunds } from "../lib/refunds"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"

/**
 * GST documents (ARCHITECTURE.md §5 rule 11):
 * - payment.captured (online) → invoice. COD invoices are issued on confirmation (cod-orders.ts).
 * - order.canceled: refunds made by the cancel → credit notes (lib/refunds.ts); an
 *   invoiced order with nothing captured (COD) → credit note
 *   for the full invoice. Paid orders get theirs from the refund (refund-processed.ts).
 */
export default async function orderDocuments({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    if (event.name === "payment.captured") {
      const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
        entity: "payment",
        fields: ["provider_id", "payment_collection.order.id"],
        filters: { id: event.data.id },
      })
      const p = data[0] as { provider_id?: string; payment_collection?: { order?: { id?: string } } } | undefined
      if (p?.payment_collection?.order?.id && p.provider_id !== "pp_cod_cod") await getOrIssueInvoice(container, p.payment_collection.order.id)
      return
    }
    // order.canceled — Medusa's cancel refunds captured payments without a payment.refunded event.
    await settleRefunds(container, event.data.id)
    const [invoice] = await container.resolve<InvoiceModuleService>(INVOICE_MODULE).listInvoices({ order_id: event.data.id })
    const o = invoice ? await loadDocOrder(container, event.data.id) : null
    if (invoice && o && capturedAmount(o) === 0) {
      const total = (invoice.data as { totals: { grandTotal: number } }).totals.grandTotal
      await issueCreditNote(container, { orderId: o.id, sourceKey: `cancel:${o.id}`, amount: total, reason: "Order cancelled" })
    }
  } catch (e) {
    logger.error(`order-documents: ${event.name} ${event.data.id}: ${(e as Error).message}`)
  }
}

export const config: SubscriberConfig = { event: ["payment.captured", "order.canceled"] }
