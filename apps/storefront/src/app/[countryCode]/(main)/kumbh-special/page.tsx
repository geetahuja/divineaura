import { listCatalogue, listCollectionsAll } from "@lib/data/catalogue"
import { getBrandName } from "@lib/data/content"
import { DEFAULT_OG_IMAGE, getSiteOrigin } from "@lib/util/site"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OmDivider from "@modules/common/components/om-divider"
import GodaJalNotice, { DispatchNote } from "@modules/goda-jal/notice"
import { SnanBadge } from "@modules/home/components/kumbh-band"
import Breadcrumbs from "@modules/listing/breadcrumbs"
import ProductCard from "@modules/listing/product-card"
import { CalendarDays, Droplets, Flame } from "lucide-react"
import { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const title = "Kumbh Special – Goda Jal (Godavari Water) from Nashik"
  const description =
    "Bring the sacred Godavari home for the Nashik–Trimbakeshwar Simhastha: Goda Jal for puja and snan at home, and Kumbh gift boxes. For religious/puja use only."
  return {
    title: { absolute: `${title} | ${await getBrandName()}` },
    description,
    alternates: { canonical: "/kumbh-special" },
    openGraph: { title, description, url: "/kumbh-special", images: [DEFAULT_OG_IMAGE] },
  }
}

const NOTES = [
  { icon: Droplets, text: "Waters of the Godavari" },
  { icon: CalendarDays, text: "Nashik Simhastha 2026–28" },
  { icon: Flame, text: "For puja & snan at home" },
]

// Products: the "Kumbh Special" collection (Admin → Collections).
export default async function KumbhSpecialPage() {
  const [all, collections, origin] = await Promise.all([listCatalogue(), listCollectionsAll(), getSiteOrigin()])
  const kumbh = collections.find((c) => c.handle === "kumbh-special")
  const products = kumbh ? all.filter((p) => p.collection_id === kumbh.id) : []
  return (
    <div className="bg-ivory">
      <div className="content-container pt-4">
        <Breadcrumbs origin={origin} items={[{ label: "Kumbh Special", href: "/kumbh-special" }]} />
      </div>
      <header className="relative isolate overflow-hidden border-b border-champagne">
        <picture>
          <source type="image/webp" srcSet="/placeholders/kumbh-ghat-pilgrims.webp" />
          <img src="/placeholders/kumbh-ghat-pilgrims.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
        </picture>
        <div className="content-container flex flex-col items-center py-12 text-center small:py-16">
          <p className="whitespace-nowrap bg-primary px-6 py-1.5 font-serif text-sm font-semibold uppercase tracking-[0.2em] text-champagne [clip-path:polygon(0_0,100%_0,95%_50%,100%_100%,0_100%,5%_50%)]">
            Kumbh Special
          </p>
          <h1 className="mt-3 font-serif text-5xl font-semibold text-primary small:text-6xl">Goda Jal</h1>
          <p className="font-serif text-2xl text-ink">Godavari Water</p>
          <OmDivider className="my-4" />
          <p className="max-w-2xl text-ink">
            The Simhastha Kumbh Mela returns to Nashik and Trimbakeshwar in 2026–28. For families who can&apos;t be at Ram Ghat or Kushavarta, we
            bring water of the Godavari home — sealed and packed by a licensed packer, for your puja and snan.
          </p>
          <SnanBadge className="mt-5" />
        </div>
      </header>
      <ul className="content-container grid grid-cols-3 gap-3 py-6 text-center text-sm text-ink">
        {NOTES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex flex-col items-center gap-1">
            <Icon className="h-6 w-6 text-accent" aria-hidden strokeWidth={1.6} />
            {text}
          </li>
        ))}
      </ul>
      <section aria-labelledby="kumbh-products" className="content-container pb-10">
        <h2 id="kumbh-products" className="font-serif text-3xl font-semibold text-primary">
          Kumbh Special products
        </h2>
        <div className="mt-3 max-w-xl">
          <DispatchNote />
        </div>
        {products.length ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 small:grid-cols-4 small:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} featured />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-soft">
            Kumbh Special products are coming soon.{" "}
            <LocalizedClientLink href="/category/goda-jal" className="font-semibold text-primary underline">
              See Goda Jal
            </LocalizedClientLink>
            .
          </p>
        )}
      </section>
      <section className="content-container grid gap-10 border-t border-champagne py-10 small:grid-cols-2">
        <div className="text-ink-soft">
          <h2 className="font-serif text-2xl font-semibold text-primary">How families use Goda Jal</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>A few drops in the kalash or abhishek water during puja.</li>
            <li>Added to bath water for a snan at home on Amrut Snan days.</li>
            <li>Sprinkled in the puja room, or at a griha pravesh.</li>
          </ul>
          <p className="mt-4">
            Planning to travel? Read{" "}
            <LocalizedClientLink href="/journal" className="font-semibold text-primary underline">
              our Journal
            </LocalizedClientLink>{" "}
            and explore{" "}
            <LocalizedClientLink href="/sacred-nashik" className="font-semibold text-primary underline">
              Sacred Nashik
            </LocalizedClientLink>
            .
          </p>
        </div>
        <GodaJalNotice />
      </section>
    </div>
  )
}
