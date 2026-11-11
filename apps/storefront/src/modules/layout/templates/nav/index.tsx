import { Suspense } from "react"

import { getRegion } from "@lib/data/regions"
import { getMainMenu } from "@lib/nav"
import { convertToLocale } from "@lib/util/money"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"
import { getRegionPolicies } from "@lib/util/store-policies"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import MegaMenu from "@modules/layout/components/mega-menu"
import MobileMenu from "@modules/layout/components/mobile-menu"
import Search from "@modules/layout/components/search"
import WishlistHeaderLink from "@modules/wishlist/header-link"
import { ShoppingBag, User } from "lucide-react"

export default async function Nav() {
  const [region, menu] = await Promise.all([getRegion(DEFAULT_COUNTRY_CODE), getMainMenu()])
  const threshold = getRegionPolicies(region)?.freeShippingThreshold

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {region && threshold != null && (
        <p className="bg-primary px-4 py-1.5 text-center text-xs font-semibold text-ivory">
          Free shipping on orders above{" "}
          {convertToLocale({ amount: threshold, currency_code: region.currency_code })}
        </p>
      )}
      <header className="bg-ivory border-b border-champagne">
        <div className="content-container flex h-14 small:h-16 items-center justify-between gap-2">
          <div className="flex flex-1 basis-0 items-center">
            <MobileMenu items={menu} />
            <LocalizedClientLink
              href="/"
              className="hidden small:block font-serif text-3xl font-semibold text-primary"
              data-testid="nav-store-link"
            >
              DivineAura
            </LocalizedClientLink>
          </div>

          <LocalizedClientLink
            href="/"
            className="small:hidden font-serif text-2xl font-semibold text-primary"
          >
            DivineAura
          </LocalizedClientLink>

          <div className="flex flex-1 basis-0 items-center justify-end gap-x-1 small:gap-x-3">
            <Search />
            <WishlistHeaderLink />
            <LocalizedClientLink
              href="/account"
              aria-label="Account"
              className="hidden small:flex p-2 text-primary hover:text-primary-hover"
              data-testid="nav-account-link"
            >
              <User className="h-5 w-5" aria-hidden />
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink href="/cart" aria-label="Cart" className="p-2 text-primary">
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>
        <MegaMenu items={menu} />
      </header>
    </div>
  )
}
