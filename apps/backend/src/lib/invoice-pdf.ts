import { COMPOSITION_DECLARATION } from "./gst-scheme"
import type { InvoiceData } from "./invoices"
import { A4, Pdf, wrap } from "./pdf"

// Brand (ARCHITECTURE.md §8)
const MAROON: [number, number, number] = [118, 32, 25]
const GOLD: [number, number, number] = [197, 138, 54]
const IVORY: [number, number, number] = [255, 245, 232]
const SOFT: [number, number, number] = [92, 74, 64]
const WHITE: [number, number, number] = [255, 255, 255]

const M = 36 // page margin
const W = A4.w - 2 * M
const money = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })

/** A4 tax invoice / bill of supply (GST composition) / credit note in brand colours. */
export function renderInvoicePdf(d: InvoiceData): Buffer {
  const pdf = new Pdf()
  const credit = d.kind === "credit_note"
  const bos = !!d.bill_of_supply // composition scheme: no tax columns, declaration instead
  const docName = bos ? "Bill" : "Invoice"

  const header = () => {
    pdf.rect(0, 0, A4.w, 64, MAROON)
    pdf.rect(0, 64, A4.w, 3, GOLD)
    pdf.text(M, 40, d.seller.brand, { font: "serif", size: 24, color: WHITE })
    pdf.text(A4.w - M, 30, credit ? "CREDIT NOTE" : bos ? "BILL OF SUPPLY" : "TAX INVOICE", { font: "bold", size: 14, color: WHITE, align: "right" })
    pdf.text(A4.w - M, 48, d.number, { size: 10, color: IVORY, align: "right" })
  }
  header()

  // Seller (left) and document facts (right)
  let y = 92
  pdf.text(M, y, "Sold by", { font: "bold", size: 8, color: GOLD })
  pdf.text(M, (y += 13), d.seller.legal_name, { font: "bold", size: 10 })
  pdf.text(M, (y += 12), `Brand: ${d.seller.brand}`, { size: 8.5, color: SOFT })
  for (const l of d.seller.lines) pdf.text(M, (y += 11), l, { size: 8.5, color: SOFT })
  pdf.text(M, (y += 11), `State: ${d.seller.state}${d.seller.state_code ? ` (${d.seller.state_code})` : ""}`, { size: 8.5, color: SOFT })
  pdf.text(M, (y += 12), `GSTIN: ${d.seller.gstin ?? "—"}`, { font: "bold", size: 9 })
  const sellerBottom = y

  const facts: [string, string][] = [
    [credit ? "Credit note no." : `${docName} no.`, d.number],
    [credit ? "Credit note date" : `${docName} date`, date(d.issued_at)],
    ...(credit ? ([[`Against ${docName.toLowerCase()}`, d.invoice_number ?? ""]] as [string, string][]) : []),
    ["Order no.", `#${d.order.number}`],
    ["Order date", date(d.order.date)],
    ["Payment", d.order.payment],
    ["Place of supply", d.place_of_supply],
  ]
  let fy = 92
  for (const [k, v] of facts) {
    pdf.text(A4.w - M - 120, (fy += 12), k, { size: 8.5, color: SOFT, align: "right" })
    pdf.text(A4.w - M, fy, v, { font: "bold", size: 8.5, align: "right" })
  }

  // Buyer
  y = Math.max(sellerBottom, fy) + 22
  pdf.line(M, y - 10, A4.w - M, y - 10)
  pdf.text(M, y + 2, "Bill to / Ship to", { font: "bold", size: 8, color: GOLD })
  pdf.text(M, (y += 15), d.buyer.name, { font: "bold", size: 10 })
  for (const l of d.buyer.lines) pdf.text(M, (y += 11), l, { size: 8.5, color: SOFT })
  pdf.text(M, (y += 11), `State: ${d.buyer.state}${d.buyer.state_code ? ` (${d.buyer.state_code})` : ""}`, { size: 8.5, color: SOFT })
  if (d.buyer.phone) pdf.text(M, (y += 11), `Phone: ${d.buyer.phone}`, { size: 8.5, color: SOFT })
  if (credit && d.reason) pdf.text(A4.w - M, y, `Reason: ${d.reason}`, { size: 8.5, color: SOFT, align: "right" })

  // Items table
  const cols = bos
    ? [{ h: "#", w: 18 }, { h: "Description", w: 285 }, { h: "HSN/SAC", w: 60 }, { h: "Qty", w: 40, r: 1 }, { h: "Amount", w: W - 403, r: 1 }]
    : d.intra_state
    ? [{ h: "#", w: 18 }, { h: "Description", w: 175 }, { h: "HSN/SAC", w: 50 }, { h: "Qty", w: 28, r: 1 }, { h: "Taxable", w: 60, r: 1 }, { h: "GST %", w: 34, r: 1 }, { h: "CGST", w: 50, r: 1 }, { h: "SGST", w: 50, r: 1 }, { h: "Total", w: W - 465, r: 1 }]
    : [{ h: "#", w: 18 }, { h: "Description", w: 175 }, { h: "HSN/SAC", w: 50 }, { h: "Qty", w: 28, r: 1 }, { h: "Taxable", w: 60, r: 1 }, { h: "GST %", w: 34, r: 1 }, { h: "IGST", w: 100, r: 1 }, { h: "Total", w: W - 465, r: 1 }]
  const xs: number[] = []
  cols.reduce((x, c) => (xs.push(x), x + c.w), M)
  const cell = (i: number, yy: number, s: string, bold = false, color?: [number, number, number]) =>
    cols[i].r ? pdf.text(xs[i] + cols[i].w - 4, yy, s, { size: 8, align: "right", font: bold ? "bold" : "regular", color }) : pdf.text(xs[i] + 4, yy, s, { size: 8, font: bold ? "bold" : "regular", color })

  const tableHead = (yy: number) => {
    pdf.rect(M, yy, W, 18, IVORY)
    cols.forEach((_, i) => cell(i, yy + 12, cols[i].h, true, MAROON))
    return yy + 18
  }
  y = tableHead(y + 18)

  d.lines.forEach((l, idx) => {
    const desc = wrap(l.description, cols[1].w - 8, 8)
    const h = 8 + desc.length * 10
    if (y + h > A4.h - 190) {
      pdf.addPage()
      header()
      y = tableHead(90)
    }
    const base = y + 12
    cell(0, base, String(idx + 1))
    desc.forEach((t, k) => pdf.text(xs[1] + 4, base + k * 10, t, { size: 8 }))
    cell(2, base, l.hsn ?? "—")
    cell(3, base, String(l.quantity))
    if (bos) {
      cell(4, base, money(l.total), true)
      y += h
      pdf.line(M, y, A4.w - M, y)
      return
    }
    cell(4, base, money(l.taxable))
    cell(5, base, `${l.rate}%`)
    if (d.intra_state) {
      cell(6, base, money(l.cgst))
      cell(7, base, money(l.sgst))
      cell(8, base, money(l.total), true)
    } else {
      cell(6, base, money(l.igst))
      cell(7, base, money(l.total), true)
    }
    y += h
    pdf.line(M, y, A4.w - M, y)
  })

  // Totals
  const t = d.totals
  const rows: [string, number][] = bos
    ? (t.roundOff ? [["Round off", t.roundOff]] : [])
    : [
    ["Taxable value", t.taxable],
    ...((d.intra_state ? [["CGST", t.cgst], ["SGST", t.sgst]] : [["IGST", t.igst]]) as [string, number][]),
    ...(t.roundOff ? ([["Round off", t.roundOff]] as [string, number][]) : []),
  ]
  y += 18
  for (const [k, v] of rows) {
    pdf.text(A4.w - M - 110, y, k, { size: 9, color: SOFT, align: "right" })
    pdf.text(A4.w - M, y, `Rs.${money(v)}`, { size: 9, align: "right" })
    y += 13
  }
  pdf.rect(A4.w - M - 230, y - 4, 230, 22, MAROON)
  pdf.text(A4.w - M - 110, y + 11, credit ? "Credit amount" : "Grand total", { font: "bold", size: 10, color: WHITE, align: "right" })
  pdf.text(A4.w - M - 6, y + 11, `Rs.${money(t.grandTotal)}`, { font: "bold", size: 11, color: WHITE, align: "right" })
  y += 36
  for (const l of wrap(d.words, W, 8.5)) pdf.text(M, (y += 11), l, { size: 8.5, font: "bold" })
  if (d.discount_note) pdf.text(M, (y += 13), d.discount_note, { size: 8, color: SOFT })
  pdf.text(M, (y += 13), bos ? COMPOSITION_DECLARATION : "Prices are inclusive of GST. Tax is not payable on reverse charge.", { size: 8, color: bos ? undefined : SOFT, font: bos ? "bold" : "regular" })

  // Footer
  pdf.line(M, A4.h - 60, A4.w - M, A4.h - 60, GOLD, 1)
  pdf.text(M, A4.h - 46, "This is a computer-generated document and does not need a signature.", { size: 7.5, color: SOFT })
  const contact = [d.seller.email, d.seller.phone].filter(Boolean).join("  ·  ")
  if (contact) pdf.text(A4.w - M, A4.h - 46, contact, { size: 7.5, color: SOFT, align: "right" })
  pdf.text(A4.w / 2, A4.h - 30, `${d.seller.brand} — ${d.seller.legal_name}`, { font: "serif", size: 9, color: MAROON, align: "center" })

  return pdf.toBuffer()
}
