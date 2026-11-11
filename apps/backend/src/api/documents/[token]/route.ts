import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { InvoiceData, readDocumentToken } from "../../../lib/invoices"
import { renderInvoicePdf } from "../../../lib/invoice-pdf"
import { INVOICE_MODULE } from "../../../modules/invoice"
import type InvoiceModuleService from "../../../modules/invoice/service"

/**
 * GET /documents/<signed token> → invoice / credit-note PDF. The token is
 * an HMAC-signed document id (from the account page or the shipped email), so
 * no login is needed and ids can't be guessed.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const t = readDocumentToken(req.params.token)
  if (!t) return res.status(404).json({ message: "Document not found" })
  const svc = req.scope.resolve<InvoiceModuleService>(INVOICE_MODULE)
  const [doc] = t.kind === "invoice" ? await svc.listInvoices({ id: t.id }) : await svc.listCreditNotes({ id: t.id })
  if (!doc) return res.status(404).json({ message: "Document not found" })
  const pdf = renderInvoicePdf(doc.data as unknown as InvoiceData)
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `inline; filename="${doc.number.replace(/\//g, "-")}.pdf"`)
  res.setHeader("Cache-Control", "private, max-age=300")
  res.send(pdf)
}
