"use client"

import type { ReviewableItem } from "@lib/data/reviews"
import { useState } from "react"
import ReviewForm from "./review-form"
import Stars from "./stars"

const STATUS: Record<string, [string, string]> = {
  pending: ["Waiting for approval", "bg-amber-50 text-amber-900"],
  approved: ["Published", "bg-green-50 text-green-800"],
  rejected: ["Not published", "bg-red-50 text-red-800"],
  hidden: ["Not published", "bg-red-50 text-red-800"],
}

// Account → order: "Write a review" per delivered product (verified buyer).
export default function OrderReviews({ orderId, items }: { orderId: string; items: ReviewableItem[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const relevant = items.filter((i) => i.can_review || i.review)
  if (!relevant.length) return null

  return (
    <section aria-labelledby="order-reviews-heading" className="flex flex-col gap-3 border-t border-champagne py-6" id="reviews">
      <h2 id="order-reviews-heading" className="font-serif text-2xl font-semibold text-primary">Review your items</h2>
      {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <ul className="grid gap-3">
        {relevant.map((i) => (
          <li key={i.item_id} className="rounded-lg border border-champagne bg-white p-3">
            <div className="flex items-center gap-3">
              {i.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink">{i.title}</p>
                {i.review && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Stars value={i.review.rating} size="h-3.5 w-3.5" label={`Your rating: ${i.review.rating} out of 5`} />
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[i.review.status][1]}`}>{STATUS[i.review.status][0]}</span>
                  </p>
                )}
              </div>
              {open !== i.item_id && (i.can_review || i.review?.editable) && (
                <button
                  type="button"
                  onClick={() => setOpen(i.item_id)}
                  className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-ivory"
                  data-testid="write-review"
                >
                  {i.review ? "Edit" : "Write a review"}
                </button>
              )}
            </div>
            {i.review?.reply && (
              <p className="mt-2 rounded-md border-l-4 border-accent bg-ivory px-3 py-2 text-sm text-ink">
                <span className="block text-xs font-semibold text-primary">Reply from the seller</span>
                {i.review.reply}
              </p>
            )}
            {open === i.item_id && (
              <ReviewForm
                target={{ order_id: orderId, item_id: i.item_id }}
                existing={i.review}
                productTitle={i.title}
                onCancel={() => setOpen(null)}
                onDone={() => {
                  setOpen(null)
                  setNotice("Thank you! Your review will appear once our team has checked it.")
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
