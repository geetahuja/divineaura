import { Metadata } from "next"

import Bestsellers from "@modules/home/components/bestsellers"
import Hero from "@modules/home/components/hero"
import SacredPlaces from "@modules/home/components/sacred-places"
import { BrandStory, PhotoReviews } from "@modules/home/components/story"
import { DeityTiles, IntentionTiles } from "@modules/home/components/tiles"
import TrustStrip from "@modules/home/components/trust-strip"
import { listRegions } from "@lib/data/regions"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { buildRegionsReturnPolicies } from "@lib/util/store-policies"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getSiteOrigin()

  return {
    title: `${STORE_NAME} | Devotional lockets, bracelets & malas`,
    description:
      "Devotional lockets, spiritual and gemstone bracelets, malas and sacred threads. Prices inclusive of all taxes.",
    alternates: { canonical: origin },
  }
}

export default async function Home() {
  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const homeUrl = origin
  const returnPolicies = buildRegionsReturnPolicies(regions)
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE_NAME,
      url: origin,
      ...(returnPolicies.length
        ? { hasMerchantReturnPolicy: returnPolicies }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: STORE_NAME,
      url: homeUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${homeUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      {/* Order: ARCHITECTURE.md §7 + Sacred Places. Footer comes from the layout. */}
      <Hero />
      <DeityTiles />
      <SacredPlaces />
      <Bestsellers />
      <IntentionTiles />
      <TrustStrip />
      <PhotoReviews />
      <BrandStory />
    </>
  )
}
