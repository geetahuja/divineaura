import type { Seller } from "@lib/data/content"

// Line-style brand marks (lucide 1.x dropped brand icons). 24×24, currentColor.
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
const ICONS = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" {...P} />
      <circle cx="12" cy="12" r="4" {...P} />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </>
  ),
  facebook: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" {...P} />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" {...P} />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
    </>
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" {...P} />
      <path d="M10.6 20.6 12.4 13m-.6 2.5c.5.4 1.2.7 2 .7 2.4 0 3.9-2 3.9-4.5 0-2.6-2.2-4.7-5.4-4.7-3.4 0-5.3 2.4-5.3 4.7 0 1.2.4 2.2 1.3 2.6" {...P} />
    </>
  ),
}
const LABELS = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", pinterest: "Pinterest" }

/** Social links from Admin → Business details; empty ones are hidden. */
export default function SocialIcons({ social }: { social: Seller["social"] | undefined }) {
  const links = (Object.keys(ICONS) as (keyof typeof ICONS)[]).filter((k) => social?.[k])
  if (!links.length) return null
  return (
    <ul className="flex items-center gap-3">
      {links.map((k) => (
        <li key={k}>
          <a
            href={social![k]!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${LABELS[k]} (opens in a new tab)`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary transition-colors hover:bg-champagne"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              {ICONS[k]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
