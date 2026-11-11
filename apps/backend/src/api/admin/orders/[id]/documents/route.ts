import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { documentUrl, getOrIssueInvoice } from "../../../../../lib/invoices"
import { INVOICE_MODULE } from "../../../../../modules/invoice"
import type InvoiceModuleService from "../../../../../modules/invoice/service"

// Invoice (issued now if the order qualifies) + credit notes, as signed PDF links.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const invoice = await getOrIssueInvoice(req.scope, req.params.id)
  const notes = await req.scope.resolve<InvoiceModuleService>(INVOICE_MODULE).listCreditNotes({ order_id: req.params.id }, { order: { issued_at: "ASC" } })
  res.json({
    invoice: invoice ? { number: invoice.number, issued_at: invoice.issued_at, url: documentUrl("invoice", invoice.id) } : null,
    credit_notes: notes.map((n) => ({ number: n.number, amount: Number(n.amount), issued_at: n.issued_at, url: documentUrl("credit_note", n.id) })),
  })
}
