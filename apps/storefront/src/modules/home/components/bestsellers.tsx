import { listCatalogue } from "@lib/data/catalogue"
import { BESTSELLER_TAG } from "@lib/listing"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCard from "@modules/listing/product-card"

const COUNT = 8

// Products tagged "bestseller" in admin. Until any are tagged, show the newest
// products under an honest "New arrivals" heading.
export default async function Bestsellers() {
  const all = await listCatalogue()
  const tagged = all.filter((p) => p.tags.includes(BESTSELLER_TAG))
  const products = (tagged.length ? tagged : [...all].sort((a, b) => b.created_at.localeCompare(a.created_at))).slice(
    0,
    COUNT
  )
  if (!products.length) return null

  return (
    <section className="content-container py-10 small:py-14" aria-labelledby="bestsellers-heading">
      <div className="flex items-end justify-between gap-4">
        <h2 id="bestsellers-heading" className="font-serif text-3xl font-semibold text-primary">
          {tagged.length ? "Bestsellers" : "New arrivals"}
        </h2>
        <LocalizedClientLink href="/shop" className="text-sm font-semibold text-primary hover:underline">
          View all
        </LocalizedClientLink>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
    </section>
  )
}
