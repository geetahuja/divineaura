import { Metadata } from "next"

import Bestsellers from "@modules/home/components/bestsellers"
import Hero from "@modules/home/components/hero"
import SacredPlaces from "@modules/home/components/sacred-places"
import { BrandStory, PhotoReviews } from "@modules/home/components/story"
import { DeityTiles, IntentionTiles } from "@modules/home/components/tiles"
import TrustStrip from "@modules/home/components/trust-strip"
import { listRegions } from "@lib/data/regions"
import { getBrand, getSeller } from "@lib/data/content"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin } from "@lib/util/site"
import { buildRegionsReturnPolicies } from "@lib/util/store-policies"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [origin, brand] = await Promise.all([getSiteOrigin(), getBrand()])

  return {
    title: { absolute: `${brand.name} | Devotional lockets, bracelets, Goda Jal & more` },
    description:
      "Devotional lockets, spiritual and gemstone bracelets, malas and sacred threads. Prices inclusive of all taxes.",
    alternates: { canonical: origin },
  }
}

export default async function Home() {
  const [origin, regions, seller, brand] = await Promise.all([getSiteOrigin(), listRegions(), getSeller(), getBrand()])
  const STORE_NAME = brand.name
  const homeUrl = origin
  const returnPolicies = buildRegionsReturnPolicies(regions)
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE_NAME,
      url: origin,
      logo: `${origin}/opengraph-image.jpg`,
      ...(seller ? { legalName: seller.legal_name } : {}),
      ...(seller?.email || seller?.phone
        ? { contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", areaServed: "IN", availableLanguage: ["en"], ...(seller.email ? { email: seller.email } : {}), ...(seller.phone ? { telephone: seller.phone } : {}) }] }
        : {}),
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
