import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createHmac, timingSafeEqual } from "node:crypto"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"
import { COD_PROVIDER_ID } from "./cod"
import { amountInWords, documentNumber, financialYear, InvoiceLine, InvoiceTotals, round2, SourceLine, splitTax, stateCode } from "./gst-invoice"

/**
 * GST invoices and credit notes (ARCHITECTURE.md §5 rule 11).
 * - One invoice per order, issued when an online payment is captured or a COD
 *   order is confirmed; numbers DA/26-27/00001, consecutive per financial year.
 * - The invoice is a frozen snapshot (`data`); the PDF is drawn from it, so
 *   re-downloads never change even if business details are edited later.
 * - Credit notes (CN/26-27/00001) for refunds and cancellations, linked to it.
 */

// SAC codes for service lines — confirm with your CA.
const SAC_SHIPPING = "996812"
const SAC_COD_FEE = "999799"

export type DocParty = { name: string; lines: string[]; state: string; state_code: string | null; gstin?: string | null; phone?: string | null; email?: string | null }
export type DocLine = InvoiceLine & { item_id?: string }
export type InvoiceData = {
  kind: "invoice" | "credit_note"
  number: string
  issued_at: string
  invoice_number?: string // credit notes: the original invoice
  reason?: string
  seller: DocParty & { legal_name: string; brand: string }
  buyer: DocParty
  order: { number: number; date: string; payment: string }
  place_of_supply: string
  intra_state: boolean
  lines: DocLine[]
  totals: InvoiceTotals
  words: string
  discount_note?: string
}

const svc = (c: MedusaContainer) => c.resolve<InvoiceModuleService>(INVOICE_MODULE)
const query = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY)

type Num = number | string | null | undefined
const n = (v: Num) => Number(v ?? 0)

type DocOrder = {
  id: string
  display_id: number
  created_at: string
  status: string
  email?: string | null
  total: Num
  discount_total: Num
  metadata?: Record<string, unknown> | null
  items: { id: string; title: string; product_title?: string | null; variant_title?: string | null; quantity: Num; total: Num; tax_total: Num; product_id?: string | null; metadata?: Record<string, unknown> | null; tax_lines?: { rate: Num }[] }[]
  shipping_methods: { name: string; total: Num; tax_total: Num; tax_lines?: { rate: Num }[] }[]
  shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; address_2?: string | null; city?: string | null; province?: string | null; postal_code?: string | null; phone?: string | null } | null
  payment_collections?: { payments?: { id: string; provider_id: string; amount: Num; captured_at?: string | null; refunds?: { id: string; amount: Num; note?: string | null; idempotency_key?: string | null }[] }[]; payment_sessions?: { provider_id: string }[] }[]
}

export async function loadDocOrder(c: MedusaContainer, orderId: string): Promise<DocOrder | null> {
  const { data } = await query(c).graph({
    entity: "order",
    fields: [
      "id", "display_id", "created_at", "status", "email", "total", "discount_total", "metadata",
      "items.id", "items.title", "items.product_title", "items.variant_title", "items.quantity", "items.total", "items.tax_total", "items.product_id", "items.metadata", "items.tax_lines.rate",
      "shipping_methods.name", "shipping_methods.total", "shipping_methods.tax_total", "shipping_methods.tax_lines.rate",
      "shipping_address.*",
      "payment_collections.payments.id", "payment_collections.payments.provider_id", "payment_collections.payments.amount", "payment_collections.payments.captured_at",
      "payment_collections.payments.refunds.id", "payment_collections.payments.refunds.amount", "payment_collections.payments.refunds.note", "payment_collections.payments.refunds.idempotency_key",
      "payment_collections.payment_sessions.provider_id",
    ],
    filters: { id: orderId },
  })
  return (data[0] as unknown as DocOrder) ?? null
}

export const isCod = (o: DocOrder) =>
  o.metadata?.payment_method === "cod" ||
  !!o.payment_collections?.some((pc) => pc.payment_sessions?.some((s) => s.provider_id === COD_PROVIDER_ID) || pc.payments?.some((p) => p.provider_id === COD_PROVIDER_ID))

export const payments = (o: DocOrder) => (o.payment_collections ?? []).flatMap((pc) => pc.payments ?? [])
export const capturedAmount = (o: DocOrder) => round2(payments(o).filter((p) => p.captured_at).reduce((a, p) => a + n(p.amount), 0))
export const refundedAmount = (o: DocOrder) => round2(payments(o).flatMap((p) => p.refunds ?? []).reduce((a, r) => a + n(r.amount), 0))

/** Paid online (captured), or a confirmed COD order. */
export const invoiceEligible = (o: DocOrder) =>
  isCod(o) ? o.metadata?.cod_status === "confirmed" || capturedAmount(o) > 0 : capturedAmount(o) > 0

async function hsnByProduct(c: MedusaContainer, ids: string[]) {
  if (!ids.length) return {}
  const { data } = await query(c).graph({ entity: "product", fields: ["id", "product_specs.hsn_code"], filters: { id: ids } })
  return Object.fromEntries((data as { id: string; product_specs?: { hsn_code?: string | null } | null }[]).map((p) => [p.id, p.product_specs?.hsn_code ?? null]))
}

const rateOf = (l: { tax_lines?: { rate: Num }[] }) => round2((l.tax_lines ?? []).reduce((a, t) => a + n(t.rate), 0))

async function sourceLines(c: MedusaContainer, o: DocOrder): Promise<(SourceLine & { item_id?: string })[]> {
  const hsn = await hsnByProduct(c, [...new Set(o.items.map((i) => i.product_id).filter(Boolean) as string[])])
  const lines: (SourceLine & { item_id?: string })[] = o.items.map((i) => {
    const fee = i.metadata?.type === "cod_fee"
    return {
      item_id: i.id,
      kind: fee ? "cod_fee" : "goods",
      description: fee ? "Cash on Delivery fee" : [i.product_title ?? i.title, i.variant_title && i.variant_title !== "Default variant" ? i.variant_title : null].filter(Boolean).join(" – "),
      hsn: fee ? SAC_COD_FEE : (i.product_id ? hsn[i.product_id] : null) ?? null,
      quantity: n(i.quantity),
      total: n(i.total),
      tax: n(i.tax_total),
      rate: rateOf(i),
    }
  })
  for (const s of o.shipping_methods ?? []) {
    if (n(s.total) > 0) lines.push({ kind: "shipping", description: `Shipping – ${s.name}`, hsn: SAC_SHIPPING, quantity: 1, total: n(s.total), tax: n(s.tax_total), rate: rateOf(s) })
  }
  // Goods first, then fees (COD fee, shipping)
  return [...lines.filter((l) => l.kind === "goods"), ...lines.filter((l) => l.kind !== "goods")]
}

function parties(settings: Awaited<ReturnType<InvoiceModuleService["getSettings"]>>, o: DocOrder) {
  const a = o.shipping_address ?? {}
  const buyerState = a.province ?? ""
  const sellerCode = stateCode(settings.state)
  const buyerCode = stateCode(buyerState)
  const devGstin = process.env.NODE_ENV === "production" ? null : "NOT SET (development)"
  return {
    seller: {
      legal_name: settings.legal_name,
      brand: settings.brand_name,
      name: settings.legal_name,
      lines: settings.address.split(/\r?\n/).filter(Boolean),
      state: settings.state,
      state_code: sellerCode,
      gstin: settings.gstin || devGstin,
      phone: settings.phone,
      email: settings.email,
    },
    buyer: {
      name: [a.first_name, a.last_name].filter(Boolean).join(" ") || "Customer",
      lines: [a.address_1, a.address_2, [a.city, a.postal_code].filter(Boolean).join(" – ")].filter(Boolean) as string[],
      state: buyerState,
      state_code: buyerCode,
      phone: a.phone ?? null,
      email: o.email ?? null,
    },
    intra: !!sellerCode && sellerCode === buyerCode,
    place: `${buyerState}${buyerCode ? ` (${buyerCode})` : ""}`,
  }
}

const inr = (v: number) => `Rs.${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Allocates the next number for a kind under a global lock (consecutive, never reused). */
async function allocate(c: MedusaContainer, kind: "invoice" | "credit_note", prefix: string, at: Date) {
  const fy = financialYear(at)
  const seq = await c.resolve(Modules.LOCKING).execute(`doc-counter:${kind}`, () => svc(c).nextSequence(kind, fy), { timeout: 10 })
  return documentNumber(prefix, fy, seq)
}

/** Returns the order's invoice, issuing it first if the order qualifies. Idempotent. */
export async function getOrIssueInvoice(c: MedusaContainer, orderId: string) {
  const [existing] = await svc(c).listInvoices({ order_id: orderId })
  if (existing) return existing
  const o = await loadDocOrder(c, orderId)
  if (!o) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  if (!invoiceEligible(o)) return null

  return c.resolve(Modules.LOCKING).execute(`invoice:${orderId}`, async () => {
    const [again] = await svc(c).listInvoices({ order_id: orderId })
    if (again) return again
    const settings = await svc(c).getSettings()
    const p = parties(settings, o)
    const { lines, totals } = splitTax(await sourceLines(c, o), p.intra, n(o.total))
    const at = new Date()
    const number = await allocate(c, "invoice", settings.invoice_prefix, at)
    const data: InvoiceData = {
      kind: "invoice",
      number,
      issued_at: at.toISOString(),
      seller: p.seller,
      buyer: p.buyer,
      order: { number: o.display_id, date: o.created_at, payment: isCod(o) ? "Cash on Delivery" : "Prepaid (online)" },
      place_of_supply: p.place,
      intra_state: p.intra,
      lines,
      totals,
      words: amountInWords(totals.grandTotal),
      discount_note: n(o.discount_total) > 0 ? `Item values are after a discount of ${inr(n(o.discount_total))}.` : undefined,
    }
    return svc(c).createInvoices({ order_id: orderId, number, issued_at: at, data: data as unknown as Record<string, unknown> })
  })
}

/**
 * Credit note against the order's invoice. With `items`, only those lines
 * (returns); when the amount covers the whole invoice, every line; otherwise
 * one refund line taxed at the invoice's average rate. Idempotent per sourceKey.
 */
export async function issueCreditNote(
  c: MedusaContainer,
  input: { orderId: string; sourceKey: string; amount: number; reason: string; items?: { item_id: string; quantity: number; amount: number }[] }
) {
  const [dup] = await svc(c).listCreditNotes({ source_key: input.sourceKey })
  if (dup) return dup
  const invoice = await getOrIssueInvoice(c, input.orderId)
  if (!invoice) return null // nothing was invoiced (e.g. unconfirmed COD) → nothing to credit
  const inv = invoice.data as unknown as InvoiceData
  const amount = round2(input.amount)
  if (amount <= 0) return null

  let src: SourceLine[]
  if (input.items?.length) {
    src = input.items.map((r) => {
      const l = inv.lines.find((x) => x.item_id === r.item_id)!
      const ratio = l.total ? l.tax / l.total : 0
      return { ...l, quantity: r.quantity, total: r.amount, tax: r.amount * ratio }
    })
  } else if (amount >= inv.totals.grandTotal - 0.01) {
    src = inv.lines
  } else {
    const ratio = inv.totals.grandTotal ? (inv.totals.cgst + inv.totals.sgst + inv.totals.igst) / inv.totals.grandTotal : 0
    src = [{ kind: "goods", description: `Refund against invoice ${inv.number}`, hsn: null, quantity: 1, total: amount, tax: amount * ratio, rate: 0 }]
  }
  const { lines, totals } = splitTax(src, inv.intra_state, amount)

  return c.resolve(Modules.LOCKING).execute(`credit-note:${input.sourceKey}`, async () => {
    const [again] = await svc(c).listCreditNotes({ source_key: input.sourceKey })
    if (again) return again
    const settings = await svc(c).getSettings()
    const at = new Date()
    const number = await allocate(c, "credit_note", settings.credit_note_prefix, at)
    const data: InvoiceData = { ...inv, kind: "credit_note", number, issued_at: at.toISOString(), invoice_number: inv.number, reason: input.reason, lines, totals, words: amountInWords(totals.grandTotal), discount_note: undefined }
    return svc(c).createCreditNotes({ number, invoice_number: inv.number, order_id: input.orderId, source_key: input.sourceKey, amount, issued_at: at, data: data as unknown as Record<string, unknown> })
  })
}

// ── Signed download links (shipped email → invoice without logging in) ─────
const linkSecret = () => process.env.OTP_SECRET || process.env.COD_CONFIRM_SECRET || ""
const sign = (s: string) => createHmac("sha256", linkSecret()).update(`doc:${s}`).digest("base64url").slice(0, 32)

export const documentToken = (kind: "invoice" | "credit_note", id: string) => `${kind === "invoice" ? "i" : "c"}_${id}~${sign(`${kind}:${id}`)}`

export function readDocumentToken(token: string): { kind: "invoice" | "credit_note"; id: string } | null {
  const m = /^([ic])_([A-Za-z0-9_]+)~([A-Za-z0-9_-]{32})$/.exec(token)
  if (!m || !linkSecret()) return null
  const kind = m[1] === "i" ? "invoice" : "credit_note"
  const expected = sign(`${kind}:${m[2]}`)
  return timingSafeEqual(Buffer.from(expected), Buffer.from(m[3])) ? { kind, id: m[2] } : null
}

export const documentUrl = (kind: "invoice" | "credit_note", id: string) =>
  `${(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")}/documents/${documentToken(kind, id)}`
