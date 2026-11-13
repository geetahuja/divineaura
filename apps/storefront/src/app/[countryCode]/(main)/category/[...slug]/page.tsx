import { categoryHref, categoryTrail, listCatalogue, listCategories } from "@lib/data/catalogue"
import { categoryClosure } from "@lib/listing"
import ListingTemplate, { listingMetadata, SearchParams } from "@modules/listing/listing-template"
import { getBrandName } from "@lib/data/content"
import { notFound } from "next/navigation"

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<SearchParams> }

// /category/bracelets/gemstone-bracelets: every segment must be the next handle down the tree.
async function resolve(slug: string[]) {
  const categories = await listCategories()
  const cat = categories.find((c) => c.handle === slug[slug.length - 1])
  if (!cat || categoryTrail(cat, categories).map((c) => c.handle).join("/") !== slug.join("/")) {
    notFound()
  }
  // "Gemstone" under "Bracelets" reads as "Gemstone bracelets".
  const parent = categories.find((c) => c.id === cat.parent_id)
  const title = parent ? `${cat.name} ${parent.name.toLowerCase()}` : cat.name
  return { cat, categories, title }
}

export async function generateMetadata(props: Props) {
  const { cat, categories, title } = await resolve((await props.params).slug)
  return listingMetadata(
    title,
    cat.description ||
      `Shop ${title.toLowerCase()} at ${await getBrandName()}. Prices inclusive of all taxes, delivered across India.`,
    categoryHref(cat, categories)
  )
}

export default async function CategoryPage(props: Props) {
  const { cat, categories, title } = await resolve((await props.params).slug)
  const ids = categoryClosure(categories).get(cat.id)!
  const products = (await listCatalogue()).filter((p) => p.category_ids.some((id) => ids.has(id)))
  const hasChildren = categories.some((c) => c.parent_id === cat.id)

  return (
    <ListingTemplate
      title={title}
      intro={cat.description}
      crumbs={[
        { label: "Shop", href: "/shop" },
        ...categoryTrail(cat, categories).map((c) => ({ label: c.name, href: categoryHref(c, categories) })),
      ]}
      products={products}
      searchParams={await props.searchParams}
      // A leaf category has nothing to narrow by type; a parent can filter to its children.
      hide={hasChildren ? [] : ["type"]}
    />
  )
}
