import type { NavItem } from "@lib/nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDown } from "lucide-react"

// Desktop only. Panels open on hover and on keyboard focus (focus-within), no JS.
export default function MegaMenu({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main" className="hidden small:block border-t border-champagne/60">
      <ul className="content-container flex items-center justify-center gap-x-6 medium:gap-x-8 h-11">
        {items.map((item) => (
          <li key={item.label} className="group relative h-full flex items-center">
            <LocalizedClientLink
              href={item.href}
              className="flex items-center gap-1 text-sm font-semibold text-ink hover:text-primary focus-visible:text-primary"
            >
              {item.label}
              {item.columns && (
                <ChevronDown aria-hidden className="h-3.5 w-3.5 text-accent transition-transform group-hover:rotate-180" />
              )}
            </LocalizedClientLink>
            {item.columns && (
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full z-50 pt-px">
                <div className="flex gap-x-12 rounded-b-lg border border-champagne bg-ivory px-8 py-6 shadow-lg">
                  {item.columns.map((col) => (
                    <div key={col.title} className="min-w-[160px]">
                      <p className="font-serif text-lg font-semibold text-primary mb-3">{col.title}</p>
                      <ul className="flex flex-col gap-2">
                        {col.links.map((link) => (
                          <li key={link.href}>
                            <LocalizedClientLink
                              href={link.href}
                              className="text-sm text-ink-soft hover:text-primary whitespace-nowrap"
                            >
                              {link.label}
                            </LocalizedClientLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
