import { sdk } from "@lib/config"
import { getBrand } from "@lib/data/content"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight, MapPin } from "lucide-react"
import Image from "next/image"
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
  caption?: string | null // older backends omit it
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

/** Line – ornament – line, as in the design (maroon hairlines with a diamond tip). */
function Ornament({ src, w, className }: { src: string; w: number; className: string }) {
  const line = "relative h-px w-[70px] bg-primary/80 small:w-[9.7vw] after:absolute after:top-1/2 after:size-1.5 after:-translate-y-1/2 after:rotate-45 after:bg-primary/80"
  return (
    <div aria-hidden className="flex items-center justify-center">
      <span className={`${line} after:-right-0.5`} />
      <Image src={src} alt="" width={w} height={128} className={`mx-3 w-auto small:mx-[0.85vw] ${className}`} />
      <span className={`${line} after:-left-0.5`} />
    </div>
  )
}

/**
 * Homepage design v2 (design-assets/website-v2): full-bleed photo under the
 * transparent header, centred italic heading between Om and lotus ornaments,
 * place caption bottom-left and an outline button bottom-right. Phones stack it.
 */
function Slide({ s, first, brandName }: { s: HeroSlide; first: boolean; brandName: string }) {
  const art = artFor(s.button_link)
  const Heading = first ? "h1" : "h2"
  const t = (v?: string | null) => v?.replaceAll("{{brand}}", brandName) ?? null
  return (
    <div className="relative isolate flex min-h-[calc(100svh-6rem)] w-full flex-col pt-16 small:h-[calc(100svh-2rem)] small:max-h-[941px] small:min-h-[600px] small:pt-0">
      <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#F6C98B_0%,#FBE3BE_38%,#FFF1DD_58%,#F3D3A6_100%)]" />
      {s.image_desktop_url ? (
        <picture>
          {s.image_mobile_url && <source media="(max-width: 1023px)" srcSet={s.image_mobile_url} />}
          <img src={s.image_desktop_url} alt={s.image_alt ?? ""} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        </picture>
      ) : (
        <picture>
          {/* Phones get a 640 px copy (~25 KB): it's a soft background behind the heading. */}
          <source media="(max-width: 639px)" type="image/webp" srcSet={`${art.src}-640.webp`} />
          <source type="image/webp" srcSet={`${art.src}.webp`} />
          <img src={`${art.src}.jpg`} alt={s.image_alt ?? ""} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} className={`absolute inset-0 -z-10 h-full w-full object-cover ${art.pos}`} />
        </picture>
      )}
      {/* Soft ivory glow behind the words, dark fade at the bottom for the white caption and button. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,245,232,0.8),rgba(255,245,232,0.35)_55%,transparent_75%),linear-gradient(to_bottom,transparent_70%,rgba(30,12,4,0.55))] small:bg-[radial-gradient(ellipse_at_54.5%_50%,rgba(255,245,232,0.3),transparent_40%),linear-gradient(to_bottom,transparent_80%,rgba(30,12,4,0.3))]" />

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center text-primary small:py-0 small:pl-[9%]">
        <Ornament src="/brand/om.png" w={136} className="h-12 small:h-[3.8vw] small:max-h-16" />
        <Heading className="mt-3 font-serif text-[clamp(2rem,8.4vw,2.75rem)] font-semibold italic leading-[1.1] small:mt-[1.2vw] small:text-[clamp(2.25rem,3.3vw,3.6rem)] small:leading-none">
          {t(s.heading)}
        </Heading>
        {s.subheading && <p className="mt-2 max-w-[36ch] font-serif text-[clamp(1.25rem,5.4vw,1.75rem)] font-medium italic leading-[1.25] small:mt-[0.5vw] small:text-[clamp(1.4rem,2.2vw,2.4rem)] small:leading-[1.22]">{t(s.subheading)}</p>}
        {s.subheading_hi && (
          <p lang="hi" className="mt-2 font-deva text-lg font-semibold small:text-[1.6vw]">
            {t(s.subheading_hi)}
          </p>
        )}
        <Ornament src="/brand/lotus.png" w={163} className="mt-3 h-10 small:mt-[0.85vw] small:h-[3vw] small:max-h-[51px]" />
      </div>

      <div className="flex flex-col items-center gap-4 px-5 pb-10 small:absolute small:inset-x-[3%] small:bottom-[4.5%] small:flex-row small:justify-between small:p-0">
        {s.caption ? (
          <p className="flex items-center gap-3 text-lg text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)] small:text-[clamp(1.1rem,1.3vw,1.4rem)]">
            <MapPin className="h-6 w-6 shrink-0 fill-white stroke-[rgba(0,0,0,0.35)] drop-shadow small:h-7 small:w-7" aria-hidden />
            {t(s.caption)}
          </p>
        ) : (
          <span />
        )}
        <LocalizedClientLink
          href={s.button_link}
          className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-white bg-[rgba(40,15,5,0.2)] px-7 py-3 text-lg text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white small:bg-[rgba(40,15,5,0.08)] small:text-[clamp(1rem,1.17vw,1.25rem)]"
        >
          {t(s.button_text)}
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
    : [{ heading: "Carry the Eternal Within.", subheading: brand.tagline_en, subheading_hi: brand.tagline_hi, button_text: "Explore the Collection", button_link: "/shop", image_desktop_url: null, image_mobile_url: null, image_alt: null, caption: null }]
  return (
    <HeroCarousel count={list.length}>
      {list.map((s, i) => (
        <Slide key={i} s={s} first={i === 0} brandName={brand.name} />
      ))}
    </HeroCarousel>
  )
}
