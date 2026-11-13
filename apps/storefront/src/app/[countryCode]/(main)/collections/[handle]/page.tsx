import { listCatalogue, listCollectionsAll } from "@lib/data/catalogue"
import ListingTemplate, { listingMetadata, SearchParams } from "@modules/listing/listing-template"
import { getBrandName } from "@lib/data/content"
import { notFound } from "next/navigation"

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<SearchParams> }

async function resolve(props: Props) {
  const handle = (await props.params).handle
  const collection = (await listCollectionsAll()).find((c) => c.handle === handle)
  if (!collection) {
    notFound()
  }
  return collection
}

export async function generateMetadata(props: Props) {
  const c = await resolve(props)
  return listingMetadata(
    c.title,
    `${c.title} at ${await getBrandName()}: devotional lockets, bracelets, malas and gifts for the occasion. Prices inclusive of all taxes.`,
    `/collections/${c.handle}`
  )
}

export default async function CollectionPage(props: Props) {
  const c = await resolve(props)
  return (
    <ListingTemplate
      title={c.title}
      crumbs={[
        { label: "Shop", href: "/shop" },
        { label: c.title, href: `/collections/${c.handle}` },
      ]}
      products={(await listCatalogue()).filter((p) => p.collection_id === c.id)}
      searchParams={await props.searchParams}
    />
  )
}
