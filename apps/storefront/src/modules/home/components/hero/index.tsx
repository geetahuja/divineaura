import { sdk } from "@lib/config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type HeroBanner = {
  heading: string
  subheading: string | null
  button_text: string
  button_link: string
  image_desktop_url: string | null
  image_mobile_url: string | null
  image_alt: string | null
}

// Shown when no admin banner is live.
const DEFAULT: HeroBanner = {
  heading: "Devotion you can wear",
  subheading: "Lockets, bracelets, malas and sacred threads, made in the traditions they come from.",
  button_text: "Shop now",
  button_link: "/shop",
  image_desktop_url: null,
  image_mobile_url: null,
  image_alt: null,
}

// Admin → Hero banners. Re-checked every 60 s so scheduled festival banners
// switch on/off within a minute of their start/end time.
const getHeroBanner = () =>
  sdk.client
    .fetch<{ hero_banner: HeroBanner | null }>("/store/hero-banner", {
      next: { revalidate: 60 },
      cache: "force-cache",
    })
    .then((r) => r.hero_banner)
    .catch(() => null)

export default async function Hero() {
  const b = (await getHeroBanner()) ?? DEFAULT
  const desktop = b.image_desktop_url
  const mobile = b.image_mobile_url || desktop

  const text = (
    <>
      <h1 className="font-serif text-4xl font-semibold leading-tight small:text-5xl">{b.heading}</h1>
      {b.subheading && <p className="max-w-md">{b.subheading}</p>}
      <LocalizedClientLink
        href={b.button_link}
        className="rounded-full bg-primary px-7 py-3 font-semibold text-white hover:bg-primary-hover"
      >
        {b.button_text}
      </LocalizedClientLink>
    </>
  )

  if (!desktop) {
    return (
      <div className="w-full border-b border-champagne bg-ivory-deep">
        <div className="content-container flex flex-col items-center gap-5 py-16 text-center text-primary small:py-28 [&>h1]:text-primary [&>p]:text-ink-soft">
          {text}
        </div>
      </div>
    )
  }

  // Image banner: <picture> serves the mobile crop under 640 px. Text sits on a
  // dark gradient so it stays readable on any photo.
  return (
    <div className="relative w-full overflow-hidden border-b border-champagne">
      <picture>
        <source media="(max-width: 639px)" srcSet={mobile!} />
        <img
          src={desktop}
          alt={b.image_alt ?? ""}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent small:bg-gradient-to-r" />
      <div className="content-container relative flex min-h-[460px] flex-col items-center justify-end gap-4 pb-10 text-center text-white small:min-h-[480px] small:items-start small:justify-center small:pb-0 small:text-left [&>h1]:text-white [&>p]:text-white/90">
        {text}
      </div>
    </div>
  )
}
