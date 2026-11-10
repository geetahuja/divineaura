import { Camera } from "lucide-react"

// Placeholder until verified-buyer photo reviews arrive (milestone 11). Never sample/fake reviews.
export function PhotoReviews() {
  return (
    <section className="content-container py-10 small:py-14" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-serif text-3xl font-semibold text-primary">From our devotees</h2>
      <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-champagne bg-ivory-deep px-6 py-10 text-center">
        <Camera aria-hidden className="h-8 w-8 text-accent" strokeWidth={1.5} />
        <p className="max-w-md text-sm text-ink-soft">
          Photos and reviews from verified buyers will appear here soon.
        </p>
      </div>
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
