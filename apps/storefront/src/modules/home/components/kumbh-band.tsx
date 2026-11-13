import { getSeller } from "@lib/data/content"
import { daysUntil } from "@lib/util/dates"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight, CalendarDays, Droplets, Flame } from "lucide-react"

const NOTES = [
  { icon: Droplets, text: "Waters of the Godavari" },
  { icon: CalendarDays, text: "Nashik Simhastha 2026–28" },
  { icon: Flame, text: "For puja & snan at home" },
]

/** "Next Amrut Snan in 12 days" badge — from Admin → Business details. */
export async function SnanBadge({ className = "" }: { className?: string }) {
  const k = (await getSeller())?.kumbh
  const days = daysUntil(k?.snan_date)
  if (days == null || !k?.snan_label) return null
  const when = new Date(`${k.snan_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  return (
    <p className={`inline-flex items-center gap-2 rounded-full border border-accent/60 bg-white/80 px-4 py-1.5 text-sm text-primary ${className}`}>
      <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
      <span>
        <strong>{k.snan_label}</strong> · {when} · {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
      </span>
    </p>
  )
}

// Option A "Kumbh Special" band → Goda Jal. Images are staging placeholders.
export default function KumbhBand() {
  return (
    <section aria-labelledby="kumbh-heading" className="relative isolate overflow-hidden border-y border-champagne bg-[linear-gradient(180deg,#FBE3BE_0%,#FFF1DD_55%,#F6D9AE_100%)]">
      <picture>
        <source type="image/webp" srcSet="/placeholders/kumbh-ghat-pilgrims.webp" />
        <img
          src="/placeholders/kumbh-ghat-pilgrims.jpg"
          alt=""
          loading="lazy"
          className="absolute inset-y-0 left-0 -z-10 h-full w-full object-cover opacity-25 small:w-[38%] small:opacity-100 [mask-image:linear-gradient(to_right,black_55%,transparent)]"
        />
      </picture>
      <div className="content-container grid grid-cols-[1fr_auto] items-center gap-4 py-10 small:grid-cols-[38%_1fr_26%] small:py-12">
        <div className="hidden small:block" />
        <div className="flex flex-col items-start text-left small:items-center small:text-center">
          <p className="relative whitespace-nowrap bg-primary px-6 py-1.5 font-serif text-sm font-semibold uppercase tracking-[0.2em] text-champagne shadow [clip-path:polygon(0_0,100%_0,95%_50%,100%_100%,0_100%,5%_50%)] small:text-lg">
            Kumbh Special
          </p>
          <h2 id="kumbh-heading" className="mt-3 font-serif text-5xl font-semibold leading-none text-primary small:text-6xl">
            Goda Jal
          </h2>
          <p className="mt-1 font-serif text-xl text-ink small:text-2xl">Godavari Water</p>
          <p className="mt-2 max-w-sm text-ink-soft">Bring the sacred Godavari home.</p>
          <LocalizedClientLink
            href="/kumbh-special"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary-hover"
          >
            Know More <ArrowRight className="h-4 w-4" aria-hidden />
          </LocalizedClientLink>
          <SnanBadge className="mt-4" />
        </div>
        <picture className="justify-self-end">
          <source type="image/webp" srcSet="/placeholders/goda-jal-bottle.webp" />
          <img src="/placeholders/goda-jal-bottle.jpg" alt="Goda Jal bottle (illustration)" loading="lazy" width={800} height={800} className="h-36 w-36 rounded-full object-cover mix-blend-multiply small:h-64 small:w-64" />
        </picture>
      </div>
      <ul className="relative grid grid-cols-3 gap-2 border-t border-champagne/70 bg-[#FFF1DD] px-4 py-4 text-center text-xs text-ink small:px-[max(1.5rem,calc((100vw-1440px)/2))] small:text-sm">
        {NOTES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex flex-col items-center gap-1 small:flex-row small:justify-center small:gap-2">
            <Icon className="h-5 w-5 text-accent" aria-hidden strokeWidth={1.6} />
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
