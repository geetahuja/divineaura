import { FOOTER_HELP, FOOTER_POLICIES, getMainMenu, NavLink } from "@lib/nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Mail } from "lucide-react"
import NewsletterForm from "@modules/layout/components/newsletter-form"

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

const Column = ({ title, links }: { title: string; links: NavLink[] }) => (
  <div>
    <p className="font-serif text-lg font-semibold text-champagne mb-3">{title}</p>
    <ul className="flex flex-col gap-2 text-sm">
      {links.map((l) => (
        <li key={l.label}>
          <LocalizedClientLink href={l.href} className="text-ivory/90 hover:text-white">
            {l.label}
          </LocalizedClientLink>
        </li>
      ))}
    </ul>
  </div>
)

export default async function Footer() {
  const menu = await getMainMenu()
  return (
    <footer className="bg-primary-hover text-ivory">
      <div className="content-container py-12 grid gap-10 grid-cols-2 small:grid-cols-4">
        <div className="col-span-2 small:col-span-1">
          <LocalizedClientLink href="/" className="font-serif text-3xl font-semibold text-white">
            DivineAura
          </LocalizedClientLink>
          <p className="mt-3 max-w-xs text-sm text-ivory/90">
            Devotional lockets, bracelets, malas and sacred threads, made with care.
          </p>
          {SUPPORT_EMAIL && (
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-ivory/90 hover:text-white"
            >
              <Mail className="h-4 w-4 text-accent" aria-hidden />
              {SUPPORT_EMAIL}
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
        <p className="content-container py-4 text-xs text-ivory/80">
          © {new Date().getFullYear()} DivineAura. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
