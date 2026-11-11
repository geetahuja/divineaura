import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RETURNS_MODULE } from "../../../../../../../modules/returns"
import type ReturnsModuleService from "../../../../../../../modules/returns/service"
import { returnContext } from "../../../../../../../lib/order-actions"
import { documentUrl, getOrIssueInvoice, isCod } from "../../../../../../../lib/invoices"
import { canCustomerCancel } from "../../../../../../../lib/order-rules"
import { listEvents } from "../../../../../../../lib/shipments"
import { INVOICE_MODULE } from "../../../../../../../modules/invoice"
import type InvoiceModuleService from "../../../../../../../modules/invoice/service"

/**
 * Everything the account order page needs beyond Medusa's order: payment method,
 * invoice + credit-note links, whether it can be cancelled, and what can be returned.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const ctx = await returnContext(req.scope, req.params.id, req.auth_context.actor_id)
  const o = ctx.order
  const timeline = (await listEvents(req.scope, o.id)).map((e) => e.status as string)
  const cancel = canCustomerCancel({ status: o.status, timeline })
  const invoice = await getOrIssueInvoice(req.scope, o.id).catch(() => null)
  const notes = await req.scope.resolve<InvoiceModuleService>(INVOICE_MODULE).listCreditNotes({ order_id: o.id }, { order: { issued_at: "ASC" } })

  res.json({
    payment_method: isCod(o) ? "cod" : "online",
    cod_status: (o.metadata?.cod_status as string) ?? null,
    invoice: invoice ? { number: invoice.number, url: documentUrl("invoice", invoice.id) } : null,
    credit_notes: notes.map((n) => ({ number: n.number, amount: Number(n.amount), url: documentUrl("credit_note", n.id) })),
    cancel: cancel.ok ? { allowed: true } : { allowed: false, reason: cancel.reason },
    returns: {
      open: ctx.window.open,
      reason: ctx.window.open ? null : ctx.window.reason,
      closes_at: "closes" in ctx.window && ctx.window.closes ? ctx.window.closes.toISOString() : null,
      window_days: ctx.windowDays,
      refund_method: ctx.refundMethod,
      lines: ctx.lines.map((l) => ({ id: l.id, title: l.title, quantity: l.quantity, returnable: l.returnable, available: Math.max(0, l.quantity - l.alreadyReturned), unit_refund: Math.round((l.total / l.quantity) * 100) / 100 })),
      // All requests, including rejected ones (with the reason) — ctx.requests excludes them for the quantity maths.
      requests: (await req.scope.resolve<ReturnsModuleService>(RETURNS_MODULE).listReturnRequests({ order_id: o.id }, { order: { created_at: "DESC" } })).map((r) => ({
        id: r.id,
        status: r.status,
        items: r.items,
        reason: r.reason,
        refund_amount: Number(r.refund_amount),
        refund_method: r.refund_method,
        payout_hint: r.payout_hint,
        pickup_awb: r.pickup_awb,
        admin_note: r.status === "rejected" ? r.admin_note : null,
        created_at: r.created_at,
      })),
    },
  })
}
