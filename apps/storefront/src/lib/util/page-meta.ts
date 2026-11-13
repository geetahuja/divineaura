import { type ContentPage, getBrandName } from "@lib/data/content"
import { DEFAULT_OG_IMAGE } from "@lib/util/site"
import type { Metadata } from "next"

// Unique title/description + canonical for an admin-edited page.
export async function contentMetadata(page: ContentPage | null, path: string): Promise<Metadata> {
  const STORE_NAME = await getBrandName()
  if (!page) return { title: "Page not found", robots: { index: false } }
  const title = page.seo_title || `${page.title} | ${STORE_NAME}`
  const description = page.seo_description || `${page.title} – ${STORE_NAME}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: STORE_NAME, type: "website", images: [DEFAULT_OG_IMAGE] },
  }
}
