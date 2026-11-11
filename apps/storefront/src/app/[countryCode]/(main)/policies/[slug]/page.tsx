import { getPage } from "@lib/data/content"
import { contentMetadata } from "@lib/util/page-meta"
import ContentPageView from "@modules/content/content-page"
import PrivacyRequestForm from "@modules/content/privacy-request-form"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-static"
export const revalidate = 60

// The policy pages (Admin → Pages). Anything else under /policies is a 404.
const POLICIES = ["shipping", "returns-refunds", "cancellation", "privacy", "terms", "grievance"] as const
type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return POLICIES.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return contentMetadata(POLICIES.includes(slug as never) ? await getPage(slug) : null, `/policies/${slug}`)
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params
  const page = POLICIES.includes(slug as never) ? await getPage(slug) : null
  if (!page) notFound()
  return (
    <ContentPageView page={page} crumbs={[{ label: page.title, href: `/policies/${slug}` }]}>
      {slug === "privacy" && <PrivacyRequestForm />}
    </ContentPageView>
  )
}
