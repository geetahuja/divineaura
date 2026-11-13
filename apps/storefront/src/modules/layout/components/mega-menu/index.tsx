import type { NavItem } from "@lib/nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDown } from "lucide-react"
import TopNavLink from "./nav-link"

// Desktop only, inline in the header row. Panels open on hover and on keyboard
// focus (focus-within), no JS state. The current section gets a gold underline.
export default function MegaMenu({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main" className="hidden small:block">
      <ul className="flex items-center gap-x-4 medium:gap-x-6 h-full">
        {items.map((item) => (
          <li key={item.label} className="group relative flex h-full items-center">
            <TopNavLink
              href={item.href}
              className="flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent py-1 font-serif text-[1.05rem] font-semibold text-ink hover:text-primary focus-visible:text-primary aria-[current=page]:border-accent aria-[current=page]:text-primary"
            >
              {item.label}
              {item.columns && <ChevronDown aria-hidden className="h-3.5 w-3.5 text-accent transition-transform group-hover:rotate-180" />}
            </TopNavLink>
            {item.columns && (
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full z-50 pt-3">
                <div className="flex gap-x-10 rounded-lg border border-champagne bg-ivory px-8 py-6 shadow-lg">
                  {item.columns.map((col) => (
                    <div key={col.title} className="min-w-[150px]">
                      <p className="font-serif text-lg font-semibold text-primary mb-3">{col.title}</p>
                      <ul className="flex flex-col gap-2">
                        {col.links.map((link) => (
                          <li key={link.href}>
                            <LocalizedClientLink href={link.href} className="text-sm text-ink-soft hover:text-primary whitespace-nowrap">
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
