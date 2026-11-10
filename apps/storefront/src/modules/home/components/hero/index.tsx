import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Placeholder until the festival-driven HeroBanner (milestone 4).
const Hero = () => {
  return (
    <div className="w-full border-b border-champagne bg-ivory-deep">
      <div className="content-container flex flex-col items-center gap-5 py-16 small:py-28 text-center">
        <Heading level="h1" className="text-4xl small:text-5xl leading-tight">
          Devotion you can wear
        </Heading>
        <p className="max-w-md text-ink-soft">
          Lockets, bracelets, malas and sacred threads, made in the traditions they come from.
        </p>
        <LocalizedClientLink
          href="/shop"
          className="rounded-full bg-primary px-7 py-3 font-semibold text-white hover:bg-primary-hover"
        >
          Shop now
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
