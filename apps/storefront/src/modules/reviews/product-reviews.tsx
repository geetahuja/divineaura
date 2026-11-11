"use client"

import { getProductReviews, PublicReview, ReviewPage, ReviewSort } from "@lib/data/reviews"
import { BadgeCheck, MessageSquareHeart, X } from "lucide-react"
import { useState, useTransition } from "react"
import Stars from "./stars"

const PAGE = 5
const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

function ReviewCard({ r, onPhoto }: { r: PublicReview; onPhoto: (url: string) => void }) {
  return (
    <li className="border-b border-champagne py-5 last:border-0" data-testid="review">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} label={`${r.rating} out of 5 stars`} />
        {r.title && <p className="font-semibold text-ink">{r.title}</p>}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
        {r.author !== "Verified buyer" && <span className="font-semibold text-ink-soft">{r.author}</span>}
        <span className="inline-flex items-center gap-1 text-green-700">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified buyer
        </span>
        <span>{date(r.created_at)}</span>
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{r.body}</p>
      {!!r.photos.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.photos.map((u, i) => (
            <button key={u} type="button" onClick={() => onPhoto(u)} className="h-20 w-20 overflow-hidden rounded-md border border-champagne" aria-label={`Enlarge photo ${i + 1} from ${r.author}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {r.incentivized && <p className="mt-2 text-xs italic text-ink-muted">Received a coupon for reviewing.</p>}
      {r.reply && (
        <div className="mt-3 rounded-md border-l-4 border-accent bg-ivory px-3 py-2">
          <p className="text-xs font-semibold text-primary">Reply from DivineAura</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{r.reply}</p>
        </div>
      )}
    </li>
  )
}

// Product page reviews (ARCHITECTURE.md §7): average, 5★–1★ bars, sort, paging, photo lightbox.
export default function ProductReviews({ productId, initial }: { productId: string; initial: ReviewPage }) {
  const [sort, setSort] = useState<ReviewSort>("newest")
  const [page, setPage] = useState(initial)
  const [photo, setPhoto] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const { summary } = initial

  const load = (s: ReviewSort, more: boolean) =>
    start(async () => {
      const next = await getProductReviews(productId, s, more ? page.reviews.length : 0, PAGE)
      setPage(more ? { ...next, reviews: [...page.reviews, ...next.reviews] } : next)
    })

  return (
    <section aria-labelledby="reviews-heading" className="mt-14" id="reviews">
      <h2 id="reviews-heading" className="font-serif text-3xl font-semibold text-primary">Reviews</h2>

      {summary.count === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-champagne bg-ivory-deep px-6 py-8 text-center">
          <MessageSquareHeart className="h-8 w-8 text-accent" strokeWidth={1.5} aria-hidden />
          <p className="text-sm text-ink-soft">No reviews yet. Reviews come only from customers who received this product.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-8 small:grid-cols-[260px_1fr]">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-4xl font-semibold text-primary">{summary.average.toFixed(1)}</span>
              <span className="text-sm text-ink-soft">out of 5</span>
            </p>
            <Stars value={summary.average} size="h-5 w-5" />
            <p className="mt-1 text-sm text-ink-soft">
              {summary.count} verified {summary.count === 1 ? "review" : "reviews"}
            </p>
            <ul className="mt-4 grid gap-1.5" aria-label="Rating breakdown">
              {(["5", "4", "3", "2", "1"] as const).map((s) => {
                const n = summary.breakdown[s] ?? 0
                const pct = summary.count ? Math.round((n / summary.count) * 100) : 0
                return (
                  <li key={s} className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="w-6 shrink-0">{s}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-champagne/60" aria-hidden>
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right">{n}</span>
                    <span className="sr-only">{`${n} ${n === 1 ? "review" : "reviews"} with ${s} ${s === "1" ? "star" : "stars"}`}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">{page.count} shown</p>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                Sort
                <select
                  value={sort}
                  onChange={(e) => {
                    const s = e.target.value as ReviewSort
                    setSort(s)
                    load(s, false)
                  }}
                  className="h-10 rounded-md border border-champagne bg-white px-2 text-base text-ink"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                  <option value="photos">With photos</option>
                </select>
              </label>
            </div>
            <ul className={pending ? "opacity-60" : ""}>
              {page.reviews.map((r) => (
                <ReviewCard key={r.id} r={r} onPhoto={setPhoto} />
              ))}
            </ul>
            {page.reviews.length < page.count && (
              <button type="button" disabled={pending} onClick={() => load(sort, true)} className="mt-3 h-11 rounded-full border border-primary px-6 font-semibold text-primary hover:bg-ivory disabled:opacity-50">
                {pending ? "Loading…" : "Show more reviews"}
              </button>
            )}
          </div>
        </div>
      )}

      {photo && (
        <div role="dialog" aria-modal="true" aria-label="Review photo" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setPhoto(null)}>
          <button type="button" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-ink" aria-label="Close photo" onClick={() => setPhoto(null)}>
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Review photo, enlarged" className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </section>
  )
}
