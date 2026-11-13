"use client"

import { Dialog, DialogPanel } from "@headlessui/react"
import type { NavItem } from "@lib/nav"
import BrandLogo, { type Brand } from "@modules/layout/components/brand-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDown, Menu, X } from "lucide-react"
import { useState } from "react"

export default function MobileMenu({ items, brand }: { items: NavItem[]; brand: Brand }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="small:hidden -ml-2 p-2 text-primary"
        data-testid="nav-menu-button"
      >
        <Menu className="h-6 w-6" />
      </button>

      <Dialog open={open} onClose={close} className="relative z-[60] small:hidden">
        <div className="fixed inset-0 bg-ink/40" aria-hidden />
        <DialogPanel className="fixed inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-ivory p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <BrandLogo brand={brand} compact as="div" />
            <button onClick={close} aria-label="Close menu" className="p-2 -mr-2 text-primary">
              <X className="h-6 w-6" />
            </button>
          </div>
          <ul className="divide-y divide-champagne">
            {items.map((item) => (
              <li key={item.label}>
                {item.columns ? (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <ChevronDown aria-hidden className="h-4 w-4 text-accent transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-3 pl-3 flex flex-col gap-4">
                      {item.columns.map((col) => (
                        <div key={col.title}>
                          <p className="text-xs uppercase tracking-wide text-ink-muted mb-1">{col.title}</p>
                          {col.links.map((link) => (
                            <LocalizedClientLink
                              key={link.href}
                              href={link.href}
                              onClick={close}
                              className="block py-1.5 text-ink-soft"
                            >
                              {link.label}
                            </LocalizedClientLink>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <LocalizedClientLink
                    href={item.href}
                    onClick={close}
                    className="block py-3.5 font-semibold text-ink"
                  >
                    {item.label}
                  </LocalizedClientLink>
                )}
              </li>
            ))}
          </ul>
        </DialogPanel>
      </Dialog>
    </>
  )
}
