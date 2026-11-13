import { placeAnchor, type SacredPlace } from "@lib/data/sacred-places"
import { tagHref } from "@lib/slug"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

// Gold line-drawn temple until the admin uploads a photo.
const TemplePlaceholder = () => (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-ivory to-champagne/70">
    <svg viewBox="0 0 120 110" aria-hidden className="h-20 w-20 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 16V6l10 3-10 3" />
      <circle cx="60" cy="20" r="3" />
      <path d="M60 23C50 40 44 55 42 78h36C76 55 70 40 60 23Z" />
      <path d="M48 48h24M45 62h30M30 78h60v18H30z" />
      <path d="M54 96V86a6 6 0 0 1 12 0v10M22 96h76M16 102h88" />
    </svg>
  </div>
)

export const placeProductsHref = (p: SacredPlace) =>
  p.collection_handle ? `/collections/${p.collection_handle}` : p.deity_tag ? tagHref(p.deity_tag) : null

/** One Sacred Places entry with an anchor (#kalaram-mandir) for the skyline links. */
export default function PlaceCard({ place }: { place: SacredPlace }) {
  const href = placeProductsHref(place)
  return (
    <li id={placeAnchor(place.name)} className="flex scroll-mt-40 flex-col overflow-hidden rounded-xl border border-champagne bg-white">
      <div className="relative aspect-[4/3] bg-ivory">
        {place.image_url ? (
          <Image src={place.image_url} alt={`${place.name}, ${place.location}`} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
        ) : (
          <TemplePlaceholder />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-2xl font-semibold text-primary">{place.name}</h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{place.location}</p>
        <p className="mt-2 flex-1 text-sm text-ink-soft">{place.description}</p>
        {place.image_url && place.image_credit && <p className="mt-2 text-[11px] text-ink-muted">Image: {place.image_credit}</p>}
        {href && (
          <LocalizedClientLink href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Related products <ArrowRight className="h-4 w-4" aria-hidden />
          </LocalizedClientLink>
        )}
      </div>
    </li>
  )
}
