import type { ContentPage } from "@lib/data/content"
import { getSiteOrigin } from "@lib/util/site"
import Breadcrumbs, { Crumb } from "@modules/listing/breadcrumbs"
import type { ReactNode } from "react"

// Prose styles for backend-rendered Markdown (headings, lists, links, notes).
export const prose =
  "max-w-none text-ink-soft [&_a]:font-semibold [&_a]:text-primary [&_a:hover]:underline [&_aside]:my-4 [&_aside]:rounded-md [&_aside]:border-l-4 [&_aside]:border-accent [&_aside]:bg-ivory [&_aside]:px-4 [&_aside]:py-3 [&_aside]:text-sm [&_aside]:font-semibold [&_aside]:text-primary [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-primary [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-ink [&_hr]:my-6 [&_hr]:border-champagne [&_li]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_p]:leading-relaxed [&_strong]:text-ink [&_ul]:ml-5 [&_ul]:list-disc"

// Admin-edited content page: breadcrumbs (+ JSON-LD), one H1, body, extras (forms, FAQ).
export default async function ContentPageView({ page, crumbs, children }: { page: ContentPage; crumbs: Crumb[]; children?: ReactNode }) {
  const origin = await getSiteOrigin()
  return (
    <div className="content-container mx-auto max-w-3xl py-8 small:py-12">
      <Breadcrumbs origin={origin} items={crumbs} />
      <h1 className="mt-4 font-serif text-3xl font-semibold text-primary small:text-4xl">{page.title}</h1>
      <p className="mt-1 text-xs text-ink-muted">Last updated {new Date(page.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      <div className={`mt-4 ${prose}`} dangerouslySetInnerHTML={{ __html: page.html }} />
      {children}
    </div>
  )
}
