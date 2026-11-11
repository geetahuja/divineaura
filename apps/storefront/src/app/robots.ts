import { getSiteOrigin } from "@lib/util/site"
import type { MetadataRoute } from "next"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getSiteOrigin()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Public URLs are unprefixed (/cart); the /in/... forms are internal rewrites.
        "/cart",
        "/checkout",
        "/account",
        "/order/",
        "/confirm/",
        "/buy/",
        "/*/cart",
        "/*/checkout",
        "/*/account",
        "/*/order/",
        "/*/confirm/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
