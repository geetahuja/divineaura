import { getBrandName } from "@lib/data/content"
import { listSacredPlaces } from "@lib/data/sacred-places"
import { DEFAULT_OG_IMAGE, getSiteOrigin } from "@lib/util/site"
import OmDivider from "@modules/common/components/om-divider"
import Breadcrumbs from "@modules/listing/breadcrumbs"
import PlaceCard from "@modules/sacred-nashik/place-card"
import { NashikSkyline } from "@modules/sacred-nashik/skyline"
import { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const title = "Sacred Nashik – a journey of faith & heritage"
  const description =
    "Kalaram Mandir, Ram Ghat, Dutondya Maruti, Trimbakeshwar, Brahmagiri, Tapovan and more: the sacred places of Nashik and the devotional pieces they inspire."
  return {
    title: { absolute: `${title} | ${await getBrandName()}` },
    description,
    alternates: { canonical: "/sacred-nashik" },
    openGraph: { title, description, url: "/sacred-nashik", images: [DEFAULT_OG_IMAGE] },
  }
}

// Places come from Admin → Sacred Places: skyline ones first, then "Other sacred places".
export default async function SacredNashikPage() {
  const [places, origin] = await Promise.all([listSacredPlaces(), getSiteOrigin()])
  const nashik = places.filter((p) => p.strip_label)
  const others = places.filter((p) => !p.strip_label)
  return (
    <div className="bg-ivory">
      <div className="content-container pt-4">
        <Breadcrumbs origin={origin} items={[{ label: "Sacred Nashik", href: "/sacred-nashik" }]} />
      </div>
      <header className="content-container py-8 text-center small:py-12">
        <h1 className="font-serif text-4xl font-semibold text-primary small:text-5xl">Sacred Nashik</h1>
        <p className="mt-1 font-serif text-xl text-ink-soft">A Journey of Faith &amp; Heritage</p>
        <OmDivider className="my-4" />
        <p className="mx-auto max-w-2xl text-ink-soft">
          Nashik sits on the banks of the Godavari, where tradition places Lord Ram&apos;s years at Panchavati and where the Simhastha Kumbh Mela
          is held at Ram Ghat and Trimbakeshwar. These are the places that inspire our pieces — tap one to read about it and see related products.
        </p>
      </header>
      <section aria-label="Nashik skyline" className="content-container pb-10">
        <NashikSkyline />
      </section>
      {nashik.length > 0 && (
        <section aria-labelledby="nashik-places" className="content-container pb-12">
          <h2 id="nashik-places" className="sr-only">
            Places in and around Nashik
          </h2>
          <ul className="grid gap-6 xsmall:grid-cols-2 small:grid-cols-3">
            {nashik.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </ul>
        </section>
      )}
      {others.length > 0 && (
        <section aria-labelledby="other-places" className="content-container border-t border-champagne pb-16 pt-10">
          <h2 id="other-places" className="font-serif text-3xl font-semibold text-primary">
            Other sacred places
          </h2>
          <ul className="mt-6 grid gap-6 xsmall:grid-cols-2 small:grid-cols-3">
            {others.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
