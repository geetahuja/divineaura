import { listCatalogue } from "@lib/data/catalogue"
import ListingTemplate, { listingMetadata, SearchParams } from "@modules/listing/listing-template"

type Props = { searchParams: Promise<SearchParams> }

export const generateMetadata = () =>
  listingMetadata(
    "Shop all",
    "Devotional lockets, spiritual and gemstone bracelets, hand ties, malas and gift sets. Prices inclusive of all taxes.",
    "/shop"
  )

export default async function ShopPage(props: Props) {
  return (
    <ListingTemplate
      title="Shop all"
      crumbs={[{ label: "Shop", href: "/shop" }]}
      products={await listCatalogue()}
      searchParams={await props.searchParams}
    />
  )
}
