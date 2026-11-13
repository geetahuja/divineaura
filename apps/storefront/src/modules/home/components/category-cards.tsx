import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Option A category row. Images are staging placeholders (GO-LIVE.md → replace).
const CARDS = [
  { title: "Gemstone Bracelets", sub: "Balance • Focus • Devotion", href: "/category/bracelets/gemstone-bracelets", img: "category-gemstone-bracelets" },
  { title: "Sacred Hand Ties & Dhaga", sub: "Faith • Protection • Blessings", href: "/category/hand-ties", img: "category-hand-ties" },
  { title: "Divine Lockets", sub: "Carry Divinity Always", href: "/category/lockets", img: "category-lockets" },
  { title: "Puja Essentials", sub: "For a Blessed Life", href: "/category/puja-essentials", img: "category-puja-essentials" },
  { title: "Goda Jal", sub: "Godavari Water", href: "/category/goda-jal", img: "goda-jal-bottle", mobileOnly: true },
]

export default function CategoryCards() {
  return (
    <section aria-label="Shop by category" className="bg-ivory py-8 small:py-12">
      <ul className="no-scrollbar content-container flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 small:grid small:grid-cols-4 small:gap-6 small:overflow-visible">
        {CARDS.map((c) => (
          <li key={c.title} className={`w-[46%] shrink-0 snap-start xsmall:w-[31%] small:w-auto ${c.mobileOnly ? "small:hidden" : ""}`}>
            <LocalizedClientLink
              href={c.href}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-champagne bg-[linear-gradient(180deg,#FFF9F1,#FBEBD6)] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <picture>
                  <source type="image/webp" srcSet={`/placeholders/${c.img}.webp`} />
                  <img src={`/placeholders/${c.img}.jpg`} alt="" loading="lazy" width={700} height={372} className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.04] ${c.mobileOnly ? "object-contain" : "object-cover"}`} />
                </picture>
              </div>
              <div className="flex flex-1 flex-col items-center px-2 pb-4 pt-3 text-center">
                <h3 className="font-serif text-lg font-semibold leading-tight text-ink small:text-xl">{c.title}</h3>
                <p className="mt-1 text-xs text-ink-soft small:text-sm">{c.sub}</p>
                <span aria-hidden className="mt-2 flex items-center gap-2 text-accent">
                  <span className="h-px w-6 bg-current" />
                  <span className="font-deva text-base leading-none">ॐ</span>
                  <span className="h-px w-6 bg-current" />
                </span>
              </div>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
