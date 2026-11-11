import { getPage } from "@lib/data/content"
import { contentMetadata } from "@lib/util/page-meta"
import { toJsonLd } from "@lib/util/product-structured-data"
import ContentPageView, { prose } from "@modules/content/content-page"
import { ChevronDown } from "lucide-react"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return contentMetadata(await getPage("faq"), "/faq")
}

// FAQ: questions/answers edited as a list in Admin → Pages, plus FAQPage JSON-LD.
export default async function FaqPage() {
  const page = await getPage("faq")
  if (!page) notFound()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a_text } })),
  }
  return (
    <ContentPageView page={page} crumbs={[{ label: page.title, href: "/faq" }]}>
      {page.faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />}
      <div className="mt-6 divide-y divide-champagne rounded-lg border border-champagne bg-white">
        {page.faq.map((f, i) => (
          <details key={i} className="group px-4" {...(i === 0 ? { open: true } : {})}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <h2 className="text-base">{f.q}</h2>
              <ChevronDown className="h-5 w-5 shrink-0 text-accent transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className={`pb-4 ${prose} [&_p]:my-1`} dangerouslySetInnerHTML={{ __html: f.a_html }} />
          </details>
        ))}
      </div>
    </ContentPageView>
  )
}
