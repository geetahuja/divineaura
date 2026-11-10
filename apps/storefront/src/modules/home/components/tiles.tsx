import { listTags } from "@lib/data/catalogue"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { Flower2, Gift, HandHeart, Leaf, LucideIcon, Shield, Sparkles, Target } from "lucide-react"

// Icons for known intentions; any new intention tag gets the lotus-like flower.
const INTENTION_ICONS: Record<string, LucideIcon> = {
  protection: Shield,
  prosperity: Sparkles,
  peace: Leaf,
  "focus-confidence": Target,
  devotion: HandHeart,
  gifting: Gift,
}

const Section = ({ id, title, sub, children }: { id: string; title: string; sub: string; children: React.ReactNode }) => (
  <section className="content-container py-10 small:py-14" aria-labelledby={id}>
    <h2 id={id} className="font-serif text-3xl font-semibold text-primary">{title}</h2>
    <p className="mt-1 text-ink-soft">{sub}</p>
    {children}
  </section>
)

export async function DeityTiles() {
  const deities = (await listTags()).filter((t) => t.kind === "deity")
  if (!deities.length) return null
  return (
    <Section id="deity-heading" title="Shop by Deity" sub="Pieces dedicated to the form you worship.">
      <ul className="no-scrollbar -mx-6 mt-6 flex gap-4 overflow-x-auto px-6 pb-2 small:mx-0 small:grid small:grid-cols-5 small:overflow-visible small:px-0 medium:grid-cols-10">
        {deities.map((d) => (
          <li key={d.slug} className="shrink-0">
            <LocalizedClientLink href={`/deity/${d.slug}`} className="group flex w-20 flex-col items-center gap-2 text-center small:w-auto">
              <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-gradient-to-b from-ivory to-champagne font-serif text-3xl font-semibold text-primary transition-transform group-hover:scale-105">
                {d.image_url ? (
                  <Image src={d.image_url} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  d.label.charAt(0)
                )}
              </span>
              <span className="text-sm font-medium leading-tight text-ink group-hover:text-primary">{d.label}</span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export async function IntentionTiles() {
  const intentions = (await listTags()).filter((t) => t.kind === "intention")
  if (!intentions.length) return null
  return (
    <Section id="intention-heading" title="Shop by Intention" sub="Choose a piece for what you hold close.">
      <ul className="mt-6 grid grid-cols-2 gap-3 xsmall:grid-cols-3 small:grid-cols-6">
        {intentions.map((t) => {
          const Icon = INTENTION_ICONS[t.slug] ?? Flower2
          return (
            <li key={t.slug}>
              <LocalizedClientLink
                href={`/intention/${t.slug}`}
                className="flex h-full flex-col items-center gap-2 overflow-hidden rounded-lg border border-champagne bg-ivory-deep text-center transition-colors hover:border-primary"
              >
                {t.image_url ? (
                  <span className="relative block aspect-[4/3] w-full">
                    <Image src={t.image_url} alt="" fill sizes="(min-width: 1024px) 16vw, 50vw" className="object-cover" />
                  </span>
                ) : (
                  <Icon aria-hidden className="mt-5 h-7 w-7 text-accent" strokeWidth={1.5} />
                )}
                <span className="px-3 pb-4 text-sm font-semibold text-ink">{t.label}</span>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
