import { listSacredPlaces, SacredPlace } from "@lib/data/sacred-places"
import { tagHref } from "@lib/slug"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

// Shown until the admin uploads a photo: brand-coloured card with a gold
// line drawing of a temple. Never a downloaded photo.
const TemplePlaceholder = ({ name }: { name: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-ivory to-champagne/70 p-4 text-center">
    <svg
      viewBox="0 0 120 110"
      aria-hidden
      className="h-20 w-20 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M60 16V6l10 3-10 3" />
      <circle cx="60" cy="20" r="3" />
      <path d="M60 23C50 40 44 55 42 78h36C76 55 70 40 60 23Z" />
      <path d="M48 48h24M45 62h30" />
      <path d="M30 78h60v18H30z" />
      <path d="M54 96V86a6 6 0 0 1 12 0v10" />
      <path d="M22 96h76M16 102h88" />
      <path d="M8 60c8-3 14-3 20 0M92 60c6-3 12-3 20 0" opacity=".5" />
    </svg>
    <span className="font-serif text-lg font-semibold leading-tight text-primary">{name}</span>
  </div>
)

const hrefFor = (p: SacredPlace) =>
  p.collection_handle
    ? `/collections/${p.collection_handle}`
    : p.deity_tag
      ? tagHref(p.deity_tag)
      : null

const Card = ({ place }: { place: SacredPlace }) => {
  const href = hrefFor(place)
  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-champagne">
        {place.image_url ? (
          <Image
            src={place.image_url}
            alt={`${place.name}, ${place.location}`}
            fill
            sizes="(min-width: 1024px) 33vw, 80vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <TemplePlaceholder name={place.name} />
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-serif text-xl font-semibold text-primary">{place.name}</h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{place.location}</p>
        <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{place.description}</p>
        {place.image_url && place.image_credit && (
          <p className="mt-1 text-[11px] text-ink-muted">Photo: {place.image_credit}</p>
        )}
      </div>
    </>
  )

  return (
    <li className="group w-[78%] shrink-0 snap-start small:w-auto">
      {href ? (
        <LocalizedClientLink href={href} className="block">
          {body}
        </LocalizedClientLink>
      ) : (
        body
      )}
    </li>
  )
}

// Swipeable row on mobile, grid on desktop. Placed on the homepage in milestone 4.
export default async function SacredPlaces() {
  const places = await listSacredPlaces()
  if (!places.length) {
    return null
  }

  return (
    <section className="content-container py-12" aria-labelledby="sacred-places-heading">
      <h2 id="sacred-places-heading" className="font-serif text-3xl font-semibold text-primary">
        Sacred Places
      </h2>
      <p className="mt-1 max-w-xl text-ink-soft">
        Temples and tirthas that inspire our pieces.
      </p>
      <ul className="no-scrollbar -mx-6 mt-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 small:mx-0 small:grid small:grid-cols-3 small:gap-6 small:overflow-visible small:px-0">
        {places.map((p) => (
          <Card key={p.id} place={p} />
        ))}
      </ul>
    </section>
  )
}
