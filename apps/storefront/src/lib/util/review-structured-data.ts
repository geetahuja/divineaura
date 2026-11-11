// Review JSON-LD (ARCHITECTURE.md §13): only from real, APPROVED reviews — the
// backend's public review routes never return anything else. No reviews → no
// aggregateRating / review fields at all (Google treats empty ratings as spam).
export type ReviewsForSeo = {
  summary: { count: number; average: number }
  reviews: { author: string; rating: number; title: string | null; body: string; created_at: string }[]
}

export function reviewStructuredData(r?: ReviewsForSeo | null) {
  if (!r || r.summary.count < 1) return {}
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: r.summary.average.toFixed(1),
      reviewCount: r.summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: r.reviews.slice(0, 5).map((v) => ({
      "@type": "Review",
      author: { "@type": "Person", name: v.author },
      datePublished: v.created_at.slice(0, 10),
      name: v.title || undefined,
      reviewBody: v.body,
      reviewRating: { "@type": "Rating", ratingValue: v.rating, bestRating: 5, worstRating: 1 },
    })),
  }
}
