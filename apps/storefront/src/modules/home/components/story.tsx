import { getPhotoReviews } from "@lib/data/reviews"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Stars from "@modules/reviews/stars"
import { BadgeCheck } from "lucide-react"

// Approved verified-buyer reviews with photos. No such reviews → no section at all
// (never sample or invented reviews).
export async function PhotoReviews() {
  const reviews = await getPhotoReviews(8)
  if (!reviews.length) return null
  return (
    <section className="content-container py-10 small:py-14" aria-labelledby="photo-reviews-heading">
      <h2 id="photo-reviews-heading" className="font-serif text-3xl font-semibold text-primary">From our devotees</h2>
      <ul className="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 small:mx-0 small:grid small:grid-cols-4 small:overflow-visible small:px-0">
        {reviews.map((r) => (
          <li key={r.id} className="w-64 shrink-0 snap-start overflow-hidden rounded-lg border border-champagne bg-white small:w-auto">
            <LocalizedClientLink href={`/products/${r.product.handle}#reviews`} className="group block">
              <div className="aspect-square overflow-hidden bg-ivory-deep">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photos[0]} alt={`Photo by ${r.author} of ${r.product.title}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="p-3">
                <Stars value={r.rating} label={`${r.rating} out of 5 stars`} />
                <p className="mt-1 line-clamp-3 text-sm text-ink">{r.title ? <strong>{r.title}. </strong> : null}{r.body}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
                  <span className="font-semibold text-ink-soft">{r.author}</span>
                  <BadgeCheck className="h-3.5 w-3.5 text-green-700" aria-label="Verified buyer" />
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-primary group-hover:underline">{r.product.title}</p>
              </div>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function BrandStory() {
  return (
    <section className="bg-primary text-white" aria-labelledby="story-heading">
      <div className="content-container grid gap-6 py-12 small:grid-cols-[1fr_2fr] small:items-center small:py-16">
        <h2 id="story-heading" className="font-serif text-3xl font-semibold text-champagne small:text-4xl">
          Our story
        </h2>
        <div className="space-y-3 text-white/90">
          <p>
            DivineAura began with a simple wish: to make devotional pieces we would be proud to wear
            ourselves. Lockets, malas, bracelets and sacred threads that honour the traditions they come from.
          </p>
          <p>
            We describe every material honestly, including whether a stone is natural, reconstituted or dyed,
            and we never promise results. What each piece means is between you and your faith.
          </p>
        </div>
      </div>
    </section>
  )
}
