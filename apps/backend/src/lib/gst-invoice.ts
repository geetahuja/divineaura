// GST invoice maths (ARCHITECTURE.md §5 rule 11). Pure and unit-tested.
// Prices are GST-inclusive: each line's total already contains its tax.

// GST state codes (first two digits of a GSTIN).
export const GST_STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", punjab: "03", chandigarh: "04", uttarakhand: "05",
  haryana: "06", delhi: "07", rajasthan: "08", "uttar pradesh": "09", bihar: "10", sikkim: "11",
  "arunachal pradesh": "12", nagaland: "13", manipur: "14", mizoram: "15", tripura: "16", meghalaya: "17",
  assam: "18", "west bengal": "19", jharkhand: "20", odisha: "21", chhattisgarh: "22", "madhya pradesh": "23",
  gujarat: "24", "dadra and nagar haveli and daman and diu": "26", maharashtra: "27", karnataka: "29",
  goa: "30", lakshadweep: "31", kerala: "32", "tamil nadu": "33", puducherry: "34",
  "andaman and nicobar islands": "35", telangana: "36", "andhra pradesh": "37", ladakh: "38",
}
const ALIASES: Record<string, string> = { orissa: "odisha", pondicherry: "puducherry", "new delhi": "delhi", "nct of delhi": "delhi", "j&k": "jammu and kashmir", uttaranchal: "uttarakhand" }

export function stateCode(state?: string | null): string | null {
  const s = (state ?? "").toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim()
  return GST_STATE_CODES[ALIASES[s] ?? s] ?? null
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// ── Financial year + numbering ─────────────────────────────────────────────
/** Indian financial year (April–March) as "26-27" for dates from 1 Apr 2026 to 31 Mar 2027 (IST). */
export function financialYear(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60_000) // IST = UTC+5:30, no DST
  const y = ist.getUTCFullYear()
  const start = ist.getUTCMonth() >= 3 ? y : y - 1
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`
}

/** "DA/26-27/00001" — GST allows at most 16 characters. */
export function documentNumber(prefix: string, fy: string, seq: number): string {
  const n = `${prefix}/${fy}/${String(seq).padStart(5, "0")}`
  if (n.length > 16) throw new Error(`Document number ${n} is longer than 16 characters`)
  return n
}

// ── Tax split ─────────────────────────────────────────────────────────────
export type SourceLine = {
  kind: "goods" | "shipping" | "cod_fee"
  description: string
  hsn: string | null
  quantity: number
  total: number // GST-inclusive, after discounts
  tax: number // GST included in total
  rate: number // % from Medusa tax lines
}

export type InvoiceLine = SourceLine & { taxable: number; cgst: number; sgst: number; igst: number }

export type InvoiceTotals = { taxable: number; cgst: number; sgst: number; igst: number; roundOff: number; grandTotal: number }

/**
 * CGST + SGST (half each) when the place of supply is the seller's state,
 * otherwise IGST. Lines are rounded to paise; any paisa left between the sum
 * of lines and the order total is shown as "Round off" so the invoice adds up.
 */
export function splitTax(lines: SourceLine[], intraState: boolean, orderTotal: number) {
  const out: InvoiceLine[] = lines.map((l) => {
    const total = round2(l.total)
    const tax = round2(l.tax)
    const cgst = intraState ? round2(tax / 2) : 0
    const sgst = intraState ? round2(tax - cgst) : 0
    return { ...l, total, tax, taxable: round2(total - tax), cgst, sgst, igst: intraState ? 0 : tax }
  })
  const sum = (k: keyof InvoiceLine) => round2(out.reduce((a, l) => a + (l[k] as number), 0))
  const grandTotal = round2(orderTotal)
  const totals: InvoiceTotals = {
    taxable: sum("taxable"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    igst: sum("igst"),
    roundOff: round2(grandTotal - sum("total")),
    grandTotal,
  }
  return { lines: out, totals }
}

/** Amount in words for the invoice footer: 1299.5 → "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only". */
export function amountInWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`)
  const three = (x: number) => [x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred` : "", two(x % 100)].filter(Boolean).join(" ")
  const words = (x: number): string => {
    if (x === 0) return "Zero"
    const parts: string[] = []
    const crore = Math.floor(x / 1e7), lakh = Math.floor((x % 1e7) / 1e5), thousand = Math.floor((x % 1e5) / 1e3), rest = x % 1e3
    if (crore) parts.push(`${words(crore)} Crore`)
    if (lakh) parts.push(`${two(lakh)} Lakh`)
    if (thousand) parts.push(`${two(thousand)} Thousand`)
    if (rest) parts.push(three(rest))
    return parts.join(" ")
  }
  const r = round2(Math.abs(n))
  const rupees = Math.floor(r)
  const paise = Math.round((r - rupees) * 100)
  return `Rupees ${words(rupees)}${paise ? ` and ${two(paise)} Paise` : ""} Only`
}
