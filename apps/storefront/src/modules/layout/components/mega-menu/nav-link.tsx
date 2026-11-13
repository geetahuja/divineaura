"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"

// Only the top-level link is a client component (for the gold "current page"
// underline); the menu panels stay server-rendered and out of the JS payload.
export default function TopNavLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const path = usePathname().replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"
  const base = href.split("#")[0]
  const active = base === "/" ? path === "/" : path.startsWith(base)
  return (
    <LocalizedClientLink href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </LocalizedClientLink>
  )
}
