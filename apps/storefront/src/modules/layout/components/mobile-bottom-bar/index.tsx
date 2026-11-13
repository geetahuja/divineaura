"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Home, Package, ShoppingBag, Store, User } from "lucide-react"
import { usePathname } from "next/navigation"

const item = "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold"

export default function MobileBottomBar({ cartCount }: { cartCount: number }) {
  const pathname = usePathname()
  const active = (href: string) =>
    (href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "text-primary" : "text-ink-soft"

  return (
    <nav
      aria-label="Quick links"
      className="small:hidden fixed inset-x-0 bottom-0 z-50 flex h-16 border-t border-champagne bg-ivory pb-[env(safe-area-inset-bottom)] box-content"
    >
      <LocalizedClientLink href="/" className={`${item} ${active("/")}`}>
        <Home className="h-5 w-5" aria-hidden />
        Home
      </LocalizedClientLink>
      <LocalizedClientLink href="/shop" className={`${item} ${active("/shop")}`}>
        <Store className="h-5 w-5" aria-hidden />
        Shop
      </LocalizedClientLink>
      <LocalizedClientLink href="/cart" className={`${item} ${active("/cart")}`}>
        <span className="relative">
          <ShoppingBag className="h-5 w-5" aria-hidden />
          {cartCount > 0 && (
            <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] leading-[18px] text-white">
              {cartCount}
            </span>
          )}
        </span>
        Cart
      </LocalizedClientLink>
      <LocalizedClientLink href="/account/orders" className={`${item} ${active("/account/orders")}`}>
        <Package className="h-5 w-5" aria-hidden />
        Orders
      </LocalizedClientLink>
      <LocalizedClientLink href="/account" className={`${item} ${pathname.startsWith("/account/orders") ? "text-ink-soft" : active("/account")}`}>
        <User className="h-5 w-5" aria-hidden />
        Account
      </LocalizedClientLink>
    </nav>
  )
}
