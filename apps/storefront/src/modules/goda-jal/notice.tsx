import { getSeller } from "@lib/data/content"
import type { ProductSpecs } from "@lib/data/product"
import { daysUntil } from "@lib/util/dates"
import { AlertTriangle, PackageCheck } from "lucide-react"

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
const missing = (what: string) => <span className="text-ink-muted">[{what} – set in Admin]</span>

/** Goda Jal is shown as a product page block and on /kumbh-special. */
export const isGodaJal = (p: { type?: { value?: string | null } | null; categories?: { handle?: string | null }[] | null }) =>
  p.type?.value === "Goda Jal" || (p.categories ?? []).some((c) => c.handle === "goda-jal")

/** Pre-order line from Admin → Business details ("Goda Jal – dispatches after"). */
export async function DispatchNote() {
  const date = (await getSeller())?.kumbh.dispatch_date
  if (daysUntil(date) == null) return null
  return (
    <p className="flex items-center gap-2 rounded-lg border border-accent/60 bg-accent-soft/60 px-3 py-2 text-sm text-ink">
      <PackageCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span>
        <strong>Pre-order:</strong> dispatches after {fmtDate(date!)}.
      </span>
    </p>
  )
}

/**
 * Use + Legal Metrology (Packaged Commodities) declarations + not-affiliated note.
 * Text, not an image, so it is readable and searchable.
 */
export default async function GodaJalNotice({ specs }: { specs?: ProductSpecs | null }) {
  const s = await getSeller()
  return (
    <section aria-labelledby="goda-jal-notice" className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-lg border-2 border-primary/70 bg-white px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        For religious/puja use only. Not for drinking or internal consumption.
      </p>
      <div>
        <h2 id="goda-jal-notice" className="font-serif text-2xl font-semibold text-primary">Declarations</h2>
        <dl className="mt-3 divide-y divide-champagne rounded-lg border border-champagne bg-white text-sm">
          {[
            ["Product", "Goda Jal (Godavari Water)"],
            ["Packed by", s?.kumbh.packer ? <span className="whitespace-pre-line">{s.kumbh.packer}</span> : missing("licensed packer name, address and licence no.")],
            ["Marketed by", s ? `${s.legal_name} (${s.brand})${s.address ? `, ${s.address}` : ""}` : missing("seller")],
            ...(specs !== undefined ? [["Net quantity", (specs?.net_quantity as string) || missing("net quantity")], ["Month & year of packing", (specs?.packed_on as string) || missing("packing month")]] : []),
            ["MRP", "As shown above (inclusive of all taxes)"],
            ["Country of origin", "India"],
            ["Consumer care", [s?.email, s?.phone].filter(Boolean).join(" · ") || missing("support contact")],
          ].map(([k, v]) => (
            <div key={k as string} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">
        {s?.brand ? `${s.brand} is` : "We are"} not affiliated with, or endorsed by, the Nashik–Trimbakeshwar Kumbh Mela Authority (NTKMA) or any government body. “Kumbh” describes the occasion only. Goda Jal is water collected from the Godavari for devotional use; we make no claim about its spiritual or physical effects.
      </p>
    </section>
  )
}
