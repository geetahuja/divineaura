import { getPage, getSeller } from "@lib/data/content"
import { contentMetadata } from "@lib/util/page-meta"
import ContactForm from "@modules/content/contact-form"
import ContentPageView from "@modules/content/content-page"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return contentMetadata(await getPage("contact"), "/contact")
}

// Contact: admin-edited text (with live seller details) + the contact form.
export default async function ContactPage() {
  const [page, seller] = await Promise.all([getPage("contact"), getSeller()])
  if (!page) notFound()
  return (
    <ContentPageView page={page} crumbs={[{ label: page.title, href: "/contact" }]}>
      <ContactForm supportEmail={seller?.email ?? null} />
    </ContentPageView>
  )
}
