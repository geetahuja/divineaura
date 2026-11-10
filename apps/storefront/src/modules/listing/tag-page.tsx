import { findTag, listCatalogue } from "@lib/data/catalogue"
import { TagKind } from "@lib/slug"
import { notFound } from "next/navigation"
import ListingTemplate, { listingMetadata, SearchParams } from "./listing-template"

// Shared by /deity/[slug] and /intention/[slug]. Slugs map back to the live
// tag list, so a tag added in admin ("deity:Ganesha") works with no code change.
export type TagPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

const COPY: Record<TagKind, { crumb: string; title: (l: string) => string; intro: (l: string) => string }> = {
  deity: {
    crumb: "Shop by deity",
    title: (l) => `${l} collection`,
    intro: (l) => `Lockets, bracelets, malas and sacred threads dedicated to ${l}.`,
  },
  intention: {
    crumb: "Shop by intention",
    title: (l) => l,
    intro: (l) =>
      `Pieces traditionally associated with ${l.toLowerCase()}. Worn as a reminder of your intention and faith.`,
  },
}

async function resolve(kind: TagKind, props: TagPageProps) {
  const tag = await findTag(kind, (await props.params).slug)
  if (!tag) {
    notFound()
  }
  return tag
}

export async function tagMetadata(kind: TagKind, props: TagPageProps) {
  const tag = await resolve(kind, props)
  return listingMetadata(COPY[kind].title(tag.label), COPY[kind].intro(tag.label), `/${kind}/${tag.slug}`)
}

export async function TagPage({ kind, ...props }: TagPageProps & { kind: TagKind }) {
  const tag = await resolve(kind, props)
  const products = (await listCatalogue()).filter((p) => p.tags.includes(tag.value))
  return (
    <ListingTemplate
      title={COPY[kind].title(tag.label)}
      intro={COPY[kind].intro(tag.label)}
      crumbs={[
        { label: "Shop", href: "/shop" },
        { label: tag.label, href: `/${kind}/${tag.slug}` },
      ]}
      products={products}
      searchParams={await props.searchParams}
      hide={[kind]}
    />
  )
}
