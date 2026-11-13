import { getBrandName } from "@lib/data/content"
import { formatArticleDate, getArticle } from "@lib/data/journal"
import { toJsonLd } from "@lib/util/product-structured-data"
import { DEFAULT_OG_IMAGE, getSiteOrigin } from "@lib/util/site"
import { prose } from "@modules/content/content-page"
import Breadcrumbs from "@modules/listing/breadcrumbs"
import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug)
  if (!a) return { title: "Article not found", robots: { index: false } }
  const title = a.seo_title || a.title
  const description = a.seo_description || a.excerpt || undefined
  const url = `/journal/${a.slug}`
  return {
    title: { absolute: `${title} | ${await getBrandName()}` },
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url, images: [a.cover_image_url || DEFAULT_OG_IMAGE] },
  }
}

export default async function ArticlePage({ params }: Props) {
  const [a, origin, brand] = await Promise.all([getArticle((await params).slug), getSiteOrigin(), getBrandName()])
  if (!a) notFound()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    ...(a.cover_image_url ? { image: [a.cover_image_url] } : {}),
    author: { "@type": "Organization", name: brand },
    publisher: { "@type": "Organization", name: brand },
    mainEntityOfPage: `${origin}/journal/${a.slug}`,
  }
  return (
    <article className="content-container max-w-3xl pb-16 pt-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <Breadcrumbs origin={origin} items={[{ label: "Journal", href: "/journal" }, { label: a.title, href: `/journal/${a.slug}` }]} />
      <header className="py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{formatArticleDate(a.published_at)}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-primary small:text-5xl">{a.title}</h1>
        {a.excerpt && <p className="mt-3 text-lg text-ink-soft">{a.excerpt}</p>}
      </header>
      {a.cover_image_url && (
        <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-xl border border-champagne">
          <Image src={a.cover_image_url} alt={a.cover_image_alt ?? ""} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      {/* Safe HTML: rendered by the backend from escaped Markdown (lib/markdown). */}
      <div className={prose} dangerouslySetInnerHTML={{ __html: a.html }} />
    </article>
  )
}
