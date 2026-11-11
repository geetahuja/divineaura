import { getPage } from "@lib/data/content"
import { contentMetadata } from "@lib/util/page-meta"
import ContentPageView from "@modules/content/content-page"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return contentMetadata(await getPage("about"), "/about")
}

export default async function AboutPage() {
  const page = await getPage("about")
  if (!page) notFound()
  return <ContentPageView page={page} crumbs={[{ label: page.title, href: "/about" }]} />
}
