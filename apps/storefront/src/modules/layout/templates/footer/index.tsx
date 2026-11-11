import { getSeller } from "@lib/data/content"
import { FOOTER_HELP, FOOTER_POLICIES, getMainMenu, NavLink } from "@lib/nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CookieSettingsButton from "@modules/consent/cookie-settings-button"
import NewsletterForm from "@modules/layout/components/newsletter-form"
import { Mail, Phone } from "lucide-react"

const Column = ({ title, links }: { title: string; links: NavLink[] }) => (
  <nav aria-label={title}>
    <h2 className="mb-3 font-serif text-lg font-semibold text-champagne">{title}</h2>
    <ul className="flex flex-col gap-2 text-sm">
      {links.map((l) => (
        <li key={l.label}>
          <LocalizedClientLink href={l.href} className="text-ivory hover:text-white hover:underline">
            {l.label}
          </LocalizedClientLink>
        </li>
      ))}
    </ul>
  </nav>
)

// Footer with the seller details and Grievance Officer required by the
// Consumer Protection (E-Commerce) Rules 2020 — from Admin → Business details.
export default async function Footer() {
  const [menu, seller] = await Promise.all([getMainMenu(), getSeller()])
  const g = seller?.grievance
  return (
    <footer className="bg-primary-hover text-ivory">
      <div className="content-container grid grid-cols-2 gap-10 py-12 small:grid-cols-4">
        <div className="col-span-2 small:col-span-1">
          <LocalizedClientLink href="/" className="font-serif text-3xl font-semibold text-white">
            DivineAura
          </LocalizedClientLink>
          <p className="mt-3 max-w-xs text-sm text-ivory">Devotional lockets, bracelets, malas and sacred threads, made with care.</p>
          {seller?.email && (
            <a href={`mailto:${seller.email}`} className="mt-4 flex items-center gap-2 text-sm text-ivory hover:text-white">
              <Mail className="h-4 w-4 text-champagne" aria-hidden />
              {seller.email}
            </a>
          )}
          {seller?.phone && (
            <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className="mt-2 flex items-center gap-2 text-sm text-ivory hover:text-white">
              <Phone className="h-4 w-4 text-champagne" aria-hidden />
              {seller.phone}
            </a>
          )}
        </div>
        <Column title="Shop" links={menu} />
        <Column title="Help" links={FOOTER_HELP} />
        <Column title="Policies" links={FOOTER_POLICIES} />
      </div>
      <div className="content-container pb-10">
        <NewsletterForm />
      </div>
      <div className="border-t border-champagne/30">
        <div className="content-container grid gap-3 py-5 text-xs leading-relaxed text-ivory small:grid-cols-2">
          {seller && (
            <p>
              <span className="font-semibold text-white">{seller.brand}</span> is a brand of <span className="font-semibold text-white">{seller.legal_name}</span>
              {seller.address && <>, {seller.address}</>}
              {seller.gstin && <> · GSTIN {seller.gstin}</>}
            </p>
          )}
          {g && (g.name || g.email) && (
            <p>
              Grievance Officer: {g.name ?? "—"}
              {g.email && (
                <>
                  {" · "}
                  <a href={`mailto:${g.email}`} className="underline hover:text-white">{g.email}</a>
                </>
              )}
              {g.phone && <> · {g.phone}</>} · complaints acknowledged within {g.ack_hours} hours.{" "}
              <LocalizedClientLink href="/policies/grievance" className="underline hover:text-white">How we handle complaints</LocalizedClientLink>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 small:col-span-2">
            <span>© {new Date().getFullYear()} {seller?.legal_name ?? "DivineAura"}. Prices inclusive of all taxes.</span>
            <CookieSettingsButton />
          </p>
        </div>
      </div>
    </footer>
  )
}
