import type { ProductSpecs } from "@lib/data/product"
import { FileCheck2 } from "lucide-react"

type Key = keyof ProductSpecs
const ROWS: { key: Key; label: string; unit?: string }[] = [
  { key: "material", label: "Material" },
  { key: "stone_type", label: "Stone" },
  { key: "bead_size_mm", label: "Bead size", unit: "mm" },
  { key: "bead_count", label: "Number of beads" },
  { key: "length_cm", label: "Length", unit: "cm" },
  { key: "dimensions_mm", label: "Dimensions", unit: "mm" },
  { key: "weight_g", label: "Weight", unit: "g" },
  { key: "chain_included", label: "Chain included" },
  { key: "colour", label: "Colour" },
  { key: "pack_quantity", label: "Pack of" },
  { key: "country_of_origin", label: "Country of origin" },
]

// Stated plainly so buyers know exactly what they get (CLAUDE.md: truthful gemstones).
const ORIGIN: Record<string, { label: string; note: string }> = {
  natural: { label: "Natural stone", note: "Mined stone. Colour and pattern vary from piece to piece." },
  reconstituted: { label: "Reconstituted stone", note: "Made from natural stone chips and powder bonded with resin." },
  dyed: { label: "Dyed stone", note: "Natural stone with colour added to enhance or even out the shade." },
}

const filled = (v: unknown) => v !== null && v !== undefined && v !== ""
const show = (v: unknown, unit?: string) =>
  typeof v === "boolean" ? (v ? "Yes" : "No") : `${v}${unit ? ` ${unit}` : ""}`

export default function ProductDetails({ specs, description }: { specs: ProductSpecs | null; description: string | null }) {
  const s = specs ?? {}
  const rows = ROWS.filter((r) => filled(s[r.key]))
  const origin = s.stone_type && typeof s.stone_origin === "string" ? ORIGIN[s.stone_origin] : undefined

  return (
    <div className="flex flex-col gap-8">
      {description && (
        <section aria-labelledby="desc-heading">
          <h2 id="desc-heading" className="font-serif text-2xl font-semibold text-primary">About this piece</h2>
          <p className="mt-2 whitespace-pre-line text-ink-soft">{description}</p>
        </section>
      )}

      {(rows.length > 0 || origin || s.certificate_url) && (
        <section aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="font-serif text-2xl font-semibold text-primary">Specifications</h2>
          {origin && (
            <div className="mt-3 rounded-lg border border-accent/50 bg-accent-soft/50 p-3">
              <p className="text-sm font-semibold text-ink">{origin.label}</p>
              <p className="text-sm text-ink-soft">{origin.note}</p>
            </div>
          )}
          {rows.length > 0 && (
            <dl className="mt-3 divide-y divide-champagne rounded-lg border border-champagne bg-white">
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-ink-muted">{r.label}</dt>
                  <dd className="text-ink">{show(s[r.key], r.unit)}</dd>
                </div>
              ))}
            </dl>
          )}
          {typeof s.certificate_url === "string" && s.certificate_url && (
            <a href={s.certificate_url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <FileCheck2 className="h-4 w-4" aria-hidden />
              View lab certificate
            </a>
          )}
        </section>
      )}

      {typeof s.mantra === "string" && s.mantra && (
        <section aria-labelledby="mantra-heading" className="rounded-2xl border-2 border-accent bg-gradient-to-b from-ivory to-champagne/50 px-5 py-6 text-center">
          <h2 id="mantra-heading" className="text-xs font-semibold uppercase tracking-widest text-accent">Mantra</h2>
          <p lang="sa" className="mt-3 whitespace-pre-line font-serif text-2xl leading-relaxed text-primary">{s.mantra}</p>
          <p className="mt-3 text-xs text-ink-muted">Printed on the card that comes with your piece.</p>
        </section>
      )}

      {typeof s.care_instructions === "string" && s.care_instructions && (
        <section aria-labelledby="care-heading">
          <h2 id="care-heading" className="font-serif text-2xl font-semibold text-primary">Care instructions</h2>
          <p className="mt-2 whitespace-pre-line text-ink-soft">{s.care_instructions}</p>
        </section>
      )}
    </div>
  )
}
