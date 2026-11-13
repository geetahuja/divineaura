import { listSacredPlaces, placeAnchor } from "@lib/data/sacred-places"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "Sacred Nashik" skyline: eight landmarks as gold line art over the hills and
 * the Godavari, left → right in the order of the strip labels (Admin → Sacred
 * Places, "Label on the skyline"). Each glyph is drawn in a 150 × 170 cell
 * with its base on y = 160. Labels below are the links (the SVG is decorative).
 */
const GLYPHS: [RegExp, React.ReactNode][] = [
  // Kalaram Mandir – nagara shikhara with mandapa and flag
  [
    /kalaram/i,
    <>
    <path d="M28 148h96v12H28z" />
    <path d="M44 148c1-14 5-26 12-34 7 8 11 20 12 34" />
    <path d="M70 148c2-34 8-64 22-88 14 24 20 54 22 88" />
    <path d="M74 128h36M77 108h30M81 88h22" opacity=".7" />
    <ellipse cx="92" cy="58" rx="7" ry="3" />
    <path d="M89 55h6l-1-6h-4zM92 49V32" />
    <path d="M92 32l13 4-13 4" fill="#B5522E" stroke="#B5522E" />
    <path d="M86 148v-12a6 6 0 0 1 12 0v12" />
    </>,
  ],
  // Ram Ghat (Ramkund) – steps and chhatris at the water
  [
    /ram ?ghat|ramkund/i,
    <>
    <path d="M6 160h138M14 152h122M22 144h106M30 136h90" />
    <path d="M40 136v-22M56 136v-22M36 114h24M34 114q14-20 28 0M48 96v-6" />
    <path d="M86 136v-30M112 136v-30M82 106h34M80 106q19-28 38 0M99 80v-8" />
    <path d="M94 136v-12a5 5 0 0 1 10 0v12" />
    </>,
  ],
  // Dutondya Maruti – stone idol with mace on the river bank
  [
    /maruti|hanuman/i,
    <>
    <path d="M30 160h90" />
    <path d="M58 160v-46q17-22 34 0v46" />
    <circle cx="75" cy="104" r="7" />
    <path d="M68 128h14M66 140h18" opacity=".7" />
    <path d="M98 154l12-34" />
    <circle cx="111" cy="116" r="6" />
    <path d="M40 154q10-4 20 0M90 154q10-4 20 0" opacity=".6" />
    </>,
  ],
  // Trimbakeshwar – black-stone shikhara with smaller towers
  [
    /trimbak/i,
    <>
    <path d="M24 140h102v20H24z" />
    <path d="M34 140c1-18 5-32 10-40 5 8 9 22 10 40M96 140c1-18 5-32 10-40 5 8 9 22 10 40" />
    <path d="M52 140c2-36 12-70 23-94 11 24 21 58 23 94" />
    <path d="M56 120h38M60 100h30M65 80h20" opacity=".7" />
    <ellipse cx="75" cy="44" rx="7" ry="3" />
    <path d="M72 41h6l-1-6h-4zM75 35V20" />
    <path d="M75 20l12 4-12 4" fill="#B5522E" stroke="#B5522E" />
    <path d="M68 160v-12a7 7 0 0 1 14 0v12" />
    </>,
  ],
  // Brahmagiri – flat-topped hill with steps and a shrine
  [
    /brahmagiri/i,
    <>
    <path d="M2 160c28-10 38-48 58-62l8-6h22l8 6c18 14 26 52 50 62" />
    <path d="M70 92V80h14v12M68 80q9-12 18 0M77 70v-4" />
    <path d="M38 156l10-14 8-12 6-14 6-14" strokeDasharray="3 3" />
    <path d="M24 136q8-6 16 0M104 128q8-6 16 0" opacity=".5" />
    </>,
  ],
  // Tapovan – banyan trees and a kutir
  [
    /tapovan/i,
    <>
    <circle cx="32" cy="112" r="16" />
    <circle cx="54" cy="100" r="20" />
    <circle cx="76" cy="114" r="15" />
    <path d="M50 120v40M44 124v20M60 124v24M34 128v10M78 128v10" />
    <path d="M94 160v-22l16-16 16 16v22M90 138h40M106 160v-12h8v12" />
    </>,
  ],
  // Shirdi Sai Baba – samadhi mandir with domes
  [
    /shirdi|sai/i,
    <>
    <path d="M30 122h90v38H30z" />
    <path d="M42 160v-16a6 6 0 0 1 12 0v16M69 160v-20a6 6 0 0 1 12 0v20M96 160v-16a6 6 0 0 1 12 0v16" />
    <path d="M56 122c0-24 38-24 38 0M75 102v-12" />
    <circle cx="75" cy="87" r="3" />
    <path d="M30 122c0-10 14-10 14 0M106 122c0-10 14-10 14 0" />
    </>,
  ],
  // Balaji – gopuram (stepped gateway tower)
  [
    /balaji|venkate|tirumala/i,
    <>
    <path d="M38 160v-20h74v20" />
    <path d="M66 160v-12a9 9 0 0 1 18 0v12" />
    <path d="M42 140l4-16h58l4 16M48 124l4-14h46l4 14M54 110l3-12h36l3 12M59 98l2-10h28l2 10" />
    <path d="M58 88q17-14 34 0M64 82v-6M75 78v-8M86 82v-6" />
    </>,
  ],
]

export async function NashikSkyline({ compact = false }: { compact?: boolean }) {
  const places = (await listSacredPlaces()).filter((p) => p.strip_label).slice(0, 10)
  // Glyph by name, so admin reordering keeps each drawing with its label; unknown places get a temple.
  const glyph = (name: string) => (GLYPHS.find(([re]) => re.test(name)) ?? GLYPHS[0])[1]
  if (!places.length) return null
  const n = places.length
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 small:mx-0 small:px-0">
      <div className="min-w-[760px]">
        <svg viewBox={`0 0 ${n * 150} 200`} className={`block w-full ${compact ? "h-auto" : "h-auto"}`} aria-hidden fill="none">
          <defs>
            <linearGradient id="nashik-river" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E8CDA9" stopOpacity=".55" />
              <stop offset="1" stopColor="#FFF5E8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M0 120C${n * 18} 92 ${n * 32} 112 ${n * 50} 98S${n * 88} 84 ${n * 108} 96 ${n * 140} 88 ${n * 150} 94V162H0Z`} fill="#F3E2C7" opacity=".7" />
          <rect x="0" y="160" width={n * 150} height="40" fill="url(#nashik-river)" />
          <g stroke="#C58A36" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {places.map((p, i) => (
              <g key={p.id} transform={`translate(${i * 150} 0)`} fill="#FBEBD6">
                {glyph(`${p.strip_label} ${p.name}`)}
              </g>
            ))}
            <path d={`M0 162H${n * 150}`} />
            <path d={`M20 176q15-4 30 0t30 0M${n * 75 - 40} 182q15-4 30 0t30 0M${n * 150 - 120} 174q15-4 30 0t30 0`} opacity=".5" />
          </g>
        </svg>
        <ul className="grid text-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {places.map((p, i) => (
            <li key={p.id} className={`px-1 ${i ? "border-l border-accent/40" : ""}`}>
              <LocalizedClientLink href={`/sacred-nashik#${placeAnchor(p.name)}`} className="block py-1 font-serif text-sm font-semibold leading-tight text-ink hover:text-primary hover:underline small:text-base">
                {p.strip_label}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Homepage section: lotus-flanked heading + skyline. */
export default async function SacredNashikStrip() {
  return (
    <section aria-labelledby="nashik-heading" className="bg-[linear-gradient(180deg,#FFF5E8,#FBEBD6)] py-10 small:py-14">
      <div className="content-container">
        <div className="flex items-center justify-center gap-3 text-accent">
          <span aria-hidden className="hidden h-px w-24 bg-current xsmall:block" />
          <span aria-hidden className="font-deva text-xl">❁</span>
          <h2 id="nashik-heading" className="font-serif text-3xl font-semibold text-primary small:text-4xl">
            <LocalizedClientLink href="/sacred-nashik" className="hover:underline">Sacred Nashik</LocalizedClientLink>
          </h2>
          <span aria-hidden className="font-deva text-xl">❁</span>
          <span aria-hidden className="hidden h-px w-24 bg-current xsmall:block" />
        </div>
        <p className="mt-1 text-center font-serif text-lg text-ink-soft">A Journey of Faith &amp; Heritage</p>
        <div className="mt-6">
          <NashikSkyline />
        </div>
      </div>
    </section>
  )
}
