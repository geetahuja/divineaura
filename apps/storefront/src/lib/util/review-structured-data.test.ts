import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewStructuredData } from "./review-structured-data"

test("no approved reviews → no rating fields in JSON-LD", () => {
  assert.deepEqual(reviewStructuredData(null), {})
  assert.deepEqual(reviewStructuredData({ summary: { count: 0, average: 0 }, reviews: [] }), {})
})

test("approved reviews → aggregateRating + up to 5 reviews", () => {
  const reviews = Array.from({ length: 7 }, (_, i) => ({ author: "Priya S., Nashik", rating: 5 - (i % 2), title: null, body: "Lovely", created_at: "2026-11-11T10:00:00Z" }))
  const d = reviewStructuredData({ summary: { count: 7, average: 4.57 }, reviews }) as {
    aggregateRating: { ratingValue: string; reviewCount: number }
    review: { author: { name: string }; datePublished: string }[]
  }
  assert.equal(d.aggregateRating.ratingValue, "4.6")
  assert.equal(d.aggregateRating.reviewCount, 7)
  assert.equal(d.review.length, 5)
  assert.equal(d.review[0].author.name, "Priya S., Nashik")
  assert.equal(d.review[0].datePublished, "2026-11-11")
})
