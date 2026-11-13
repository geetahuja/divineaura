import { listCatalogue } from "@lib/data/catalogue"
import { BESTSELLER_TAG } from "@lib/listing"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCard from "@modules/listing/product-card"

const COUNT = 4

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
      <div className="flex items-center justify-center gap-3 text-accent">
        <span aria-hidden className="hidden h-px w-24 bg-current xsmall:block" />
        <span aria-hidden className="text-xl">❁</span>
        <h2 id="bestsellers-heading" className="font-serif text-3xl font-semibold text-primary small:text-4xl">
          {tagged.length ? "Featured Products" : "New Arrivals"}
        </h2>
        <span aria-hidden className="text-xl">❁</span>
        <span aria-hidden className="hidden h-px w-24 bg-current xsmall:block" />
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-3 small:grid-cols-4 small:gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} featured />
        ))}
      </ul>
      <p className="mt-6 text-center">
        <LocalizedClientLink href="/shop" className="font-semibold text-primary underline-offset-4 hover:underline">
          View all products
        </LocalizedClientLink>
      </p>
    </section>
  )
}
