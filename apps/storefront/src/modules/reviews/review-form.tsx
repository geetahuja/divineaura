"use client"

import { OwnReview, saveReview } from "@lib/data/reviews"
import { resizeImage } from "@lib/util/resize-image"
import { Star, X } from "lucide-react"
import { useState } from "react"

const field = "w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const MIN = 20
const MAX_PHOTOS = 4
const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"]

// Write / edit a review (pending until approved). Mobile-first; photos resized
// and re-encoded in the browser (drops EXIF) and stripped again on the server.
export default function ReviewForm({
  target,
  existing,
  productTitle,
  onDone,
  onCancel,
}: {
  target: { order_id: string; item_id: string }
  existing: OwnReview | null
  productTitle: string
  onDone: () => void
  onCancel: () => void
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [title, setTitle] = useState(existing?.title ?? "")
  const [body, setBody] = useState(existing?.body ?? "")
  const [kept, setKept] = useState<string[]>(existing?.photos ?? [])
  const [added, setAdded] = useState<string[]>([])
  const [showName, setShowName] = useState(existing ? existing.display_name !== "Verified buyer" : true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const room = MAX_PHOTOS - kept.length - added.length

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return setError("Please choose a star rating.")
    if (body.trim().length < MIN) return setError(`Please write at least ${MIN} characters about the product.`)
    setBusy(true)
    setError(null)
    const r = await saveReview(existing ? { review_id: existing.id } : target, {
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      photos: added,
      keep_photos: kept,
      show_name: showName,
    })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-4 rounded-lg border border-champagne bg-white p-4" noValidate data-testid="review-form">
      <p className="font-serif text-xl font-semibold text-primary">{existing ? "Edit your review" : "Write a review"}</p>
      <p className="-mt-3 text-sm text-ink-soft">{productTitle}</p>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Your rating</legend>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} – ${LABELS[n]}`}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star className={`h-8 w-8 text-accent ${n <= rating ? "fill-accent" : "fill-transparent"}`} strokeWidth={1.5} aria-hidden />
            </button>
          ))}
          <span className="ml-2 text-sm text-ink-soft">{LABELS[rating]}</span>
        </div>
      </fieldset>

      <div>
        <label htmlFor="rv-title" className="mb-1 block text-sm font-semibold text-ink">Title <span className="font-normal text-ink-muted">(optional)</span></label>
        <input id="rv-title" maxLength={120} className={`${field} h-12`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="rv-body" className="mb-1 block text-sm font-semibold text-ink">Your review</label>
        <textarea id="rv-body" rows={5} maxLength={3000} className={`${field} py-2`} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby="rv-body-help" />
        <p id="rv-body-help" className="mt-1 text-xs text-ink-muted">
          {body.trim().length < MIN ? `${MIN - body.trim().length} more characters needed. ` : ""}Tell others about the quality, finish and how it feels to wear.
        </p>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-ink">Photos <span className="font-normal text-ink-muted">(optional, up to {MAX_PHOTOS})</span></p>
        {(kept.length > 0 || added.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {[...kept.map((u) => ({ u, kept: true })), ...added.map((u) => ({ u, kept: false }))].map(({ u, kept: k }, i) => (
              <div key={u.slice(-40) + i} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${i + 1}`} className="h-full w-full rounded-md object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => (k ? setKept(kept.filter((x) => x !== u)) : setAdded(added.filter((x) => x !== u)))}
                  className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-white"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
        {room > 0 && (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="Add photos"
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-champagne file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []).slice(0, room)
              setAdded([...added, ...(await Promise.all(files.map((f) => resizeImage(f))))])
              e.target.value = ""
            }}
          />
        )}
        <p className="mt-1 text-xs text-ink-muted">Location and camera details are removed from photos before they're saved.</p>
      </div>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#762019]" />
        <span>
          Show my first name and city (e.g. “Priya S., Nashik”)
          <span className="block text-xs text-ink-muted">Untick to appear as “Verified buyer”. Your phone number and email are never shown.</span>
        </span>
      </label>

      <p className="text-xs text-ink-muted">Reviews are checked by our team before they appear. You can edit yours until then.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {busy ? "Sending…" : existing ? "Save changes" : "Submit review"}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-full border border-champagne px-6 font-semibold text-ink">Cancel</button>
      </div>
    </form>
  )
}
