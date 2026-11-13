import { getBrandName } from "@lib/data/content"
import { formatArticleDate, listArticles } from "@lib/data/journal"
import { DEFAULT_OG_IMAGE, getSiteOrigin } from "@lib/util/site"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OmDivider from "@modules/common/components/om-divider"
import Breadcrumbs from "@modules/listing/breadcrumbs"
import { Metadata } from "next"
import Image from "next/image"

export const dynamic = "force-static"
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const description = "Stories of Nashik, the Godavari and the Simhastha Kumbh, festivals and the traditions behind our pieces."
  return {
    title: "Journal",
    description,
    alternates: { canonical: "/journal" },
    openGraph: { title: `Journal | ${await getBrandName()}`, description, url: "/journal", images: [DEFAULT_OG_IMAGE] },
  }
}

export default async function JournalPage() {
  const [articles, origin] = await Promise.all([listArticles(), getSiteOrigin()])
  return (
    <div className="content-container pb-16 pt-4">
      <Breadcrumbs origin={origin} items={[{ label: "Journal", href: "/journal" }]} />
      <header className="py-8 text-center">
        <h1 className="font-serif text-4xl font-semibold text-primary small:text-5xl">Journal</h1>
        <OmDivider className="my-4" />
        <p className="mx-auto max-w-xl text-ink-soft">Stories of Nashik, the Godavari, festivals and the traditions behind our pieces.</p>
      </header>
      {articles.length ? (
        <ul className="grid gap-8 xsmall:grid-cols-2 small:grid-cols-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <LocalizedClientLink href={`/journal/${a.slug}`} className="group block">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-champagne bg-ivory-deep">
                  {a.cover_image_url && (
                    <Image src={a.cover_image_url} alt={a.cover_image_alt ?? ""} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{formatArticleDate(a.published_at)}</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-primary group-hover:underline">{a.title}</h2>
                {a.excerpt && <p className="mt-2 text-sm text-ink-soft">{a.excerpt}</p>}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-ink-soft">
          New articles are on their way. Meanwhile, explore{" "}
          <LocalizedClientLink href="/sacred-nashik" className="font-semibold text-primary underline">
            Sacred Nashik
          </LocalizedClientLink>
          .
        </p>
      )}
    </div>
  )
}
