import { sdk } from "@lib/config"
import { getBrand } from "@lib/data/content"
import OmDivider from "@modules/common/components/om-divider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"
import HeroCarousel from "./carousel"

export type HeroSlide = {
  heading: string
  subheading: string | null
  subheading_hi: string | null
  button_text: string
  button_link: string
  image_desktop_url: string | null
  image_mobile_url: string | null
  image_alt: string | null
}

// Admin → Hero banners (all live slides). Re-checked every 60 s so scheduled
// festival slides switch on/off within a minute of their start/end time.
const getSlides = () =>
  sdk.client
    .fetch<{ hero_banners?: HeroSlide[] }>("/store/hero-banner", { next: { revalidate: 60 }, cache: "force-cache" })
    .then((r) => r.hero_banners ?? [])
    .catch(() => [] as HeroSlide[])

// Built-in artwork for slides without an uploaded photo, picked by the slide's link.
// ponytail: these are AI-mockup crops for staging (GO-LIVE.md lists them for replacement).
const artFor = (link: string) =>
  /kumbh|goda-jal/.test(link) ? { src: "/placeholders/kumbh-ghat-pilgrims", pos: "object-left" } : /bracelet/.test(link) ? { src: "/placeholders/diya-rudraksha", pos: "object-center" } : { src: "/placeholders/temple-ghats", pos: "object-right" }

function Slide({ s, first }: { s: HeroSlide; first: boolean }) {
  const art = artFor(s.button_link)
  const Heading = first ? "h1" : "h2"
  return (
    <div className="relative isolate flex min-h-[440px] w-full shrink-0 snap-center items-center justify-center overflow-hidden small:min-h-[480px]">
      {/* Sunrise sky + river, then the photo blended in on the right (desktop) / behind (mobile). */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#F6C98B_0%,#FBE3BE_38%,#FFF1DD_58%,#F3D3A6_100%)]" />
      {s.image_desktop_url ? (
        <picture>
          {s.image_mobile_url && <source media="(max-width: 639px)" srcSet={s.image_mobile_url} />}
          <img src={s.image_desktop_url} alt={s.image_alt ?? ""} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        </picture>
      ) : (
        <picture>
          <source type="image/webp" srcSet={`${art.src}.webp`} />
          <img
            src={`${art.src}.jpg`}
            alt={s.image_alt ?? ""}
            fetchPriority={first ? "high" : "auto"}
            loading={first ? "eager" : "lazy"}
            className={`absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-60 small:w-[55%] small:opacity-90 ${art.pos} [mask-image:linear-gradient(to_right,transparent,black_35%)]`}
          />
        </picture>
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,245,232,0.92)_0%,rgba(255,245,232,0.75)_38%,rgba(255,245,232,0)_72%)]" />
      <div className="content-container flex flex-col items-center gap-3 py-12 text-center">
        <Heading className="font-serif text-[2.4rem] font-semibold leading-[1.05] text-primary small:text-6xl">{s.heading}</Heading>
        <OmDivider className="my-1" />
        {s.subheading && <p className="font-serif text-xl font-medium text-primary small:text-3xl">{s.subheading}</p>}
        {s.subheading_hi && (
          <p lang="hi" className="font-deva text-lg font-semibold text-primary small:text-2xl">
            {s.subheading_hi}
          </p>
        )}
        <LocalizedClientLink
          href={s.button_link}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {s.button_text}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default async function Hero() {
  const [slides, brand] = await Promise.all([getSlides(), getBrand()])
  // No live slide: the brand slide, taglines from Business details.
  const list: HeroSlide[] = slides.length
    ? slides
    : [{ heading: "Carry the Eternal Within.", subheading: brand.tagline_en, subheading_hi: brand.tagline_hi, button_text: "Explore the Collection", button_link: "/shop", image_desktop_url: null, image_mobile_url: null, image_alt: null }]
  return (
    <HeroCarousel count={list.length}>
      {list.map((s, i) => (
        <Slide key={i} s={s} first={i === 0} />
      ))}
    </HeroCarousel>
  )
}
