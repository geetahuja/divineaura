"use client"

import { signout } from "@lib/data/customer"
import { useWishlist } from "@modules/wishlist/context"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart, LayoutGrid, LogOut, MapPin, Package, User } from "lucide-react"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid, testid: "overview-link" },
  { href: "/account/orders", label: "Orders", icon: Package, testid: "orders-link" },
  { href: "/account/addresses", label: "Addresses", icon: MapPin, testid: "addresses-link" },
  { href: "/wishlist", label: "Wishlist", icon: Heart, testid: "wishlist-link" },
  { href: "/account/profile", label: "Profile", icon: User, testid: "profile-link" },
]

// Account sections (ARCHITECTURE.md §11): scrollable tabs on phones, a sidebar from tablet up.
export default function AccountNav({ customer }: { customer: HttpTypes.StoreCustomer | null }) {
  const path = (usePathname() ?? "").replace(/^\/[a-z]{2}(?=\/)/, "") // drop the /in prefix
  const wishlist = useWishlist()
  const active = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href))

  return (
    <nav aria-label="Account" data-testid="account-nav">
      <p className="mb-3 font-serif text-xl font-semibold text-primary">
        Hello{customer?.first_name ? ` ${customer.first_name}` : ""}
      </p>
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 small:mx-0 small:flex-col small:gap-1 small:overflow-visible small:px-0">
        {LINKS.map(({ href, label, icon: Icon, testid }) => (
          <li key={href} className="shrink-0">
            <LocalizedClientLink
              href={href}
              data-testid={testid}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold small:rounded-md small:border-0 small:px-3 ${
                active(href) ? "border-primary bg-primary text-white small:bg-champagne/60 small:text-primary" : "border-champagne bg-white text-ink hover:text-primary small:bg-transparent"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </LocalizedClientLink>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            onClick={async () => {
              wishlist.reset()
              await signout()
            }}
            data-testid="logout-button"
            className="flex items-center gap-2 rounded-full border border-champagne bg-white px-4 py-2 text-sm font-semibold text-ink-soft hover:text-primary small:rounded-md small:border-0 small:bg-transparent small:px-3"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </button>
        </li>
      </ul>
    </nav>
  )
}
