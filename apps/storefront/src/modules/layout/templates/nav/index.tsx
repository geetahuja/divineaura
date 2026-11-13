import { Suspense } from "react"

import { getBrand } from "@lib/data/content"
import { getRegion } from "@lib/data/regions"
import { getHeaderMenu } from "@lib/nav"
import { convertToLocale } from "@lib/util/money"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"
import { getRegionPolicies } from "@lib/util/store-policies"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import BrandLogo from "@modules/layout/components/brand-logo"
import CartButton from "@modules/layout/components/cart-button"
import MegaMenu from "@modules/layout/components/mega-menu"
import MobileMenu from "@modules/layout/components/mobile-menu"
import Search from "@modules/layout/components/search"
import WishlistHeaderLink from "@modules/wishlist/header-link"
import { ShoppingBag, Truck, User } from "lucide-react"

// Option A header: maroon top bar, then logo + taglines, inline menu and icons.
export default async function Nav() {
  const [region, menu, brand] = await Promise.all([getRegion(DEFAULT_COUNTRY_CODE), getHeaderMenu(), getBrand()])
  const threshold = getRegionPolicies(region)?.freeShippingThreshold

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <div className="bg-primary text-ivory">
        <div className="content-container grid h-8 grid-cols-1 items-center text-xs small:grid-cols-3">
          <p className="hidden small:block">
            <span aria-hidden className="mr-1 font-deva text-champagne">ॐ</span> Spirituality • Devotion • Wellness
          </p>
          <p aria-hidden className="hidden small:block text-center font-deva text-sm tracking-[0.3em] text-champagne">॥ ॐ ॥</p>
          {region && threshold != null && (
            <p className="flex items-center justify-center gap-2 font-semibold small:justify-end">
              <Truck className="h-4 w-4 text-champagne" aria-hidden />
              Free Shipping on Orders Above {convertToLocale({ amount: threshold, currency_code: region.currency_code })}
            </p>
          )}
        </div>
      </div>
      <header className="border-b border-champagne bg-ivory">
        <div className="content-container flex h-16 items-center justify-between gap-2 small:h-24 small:gap-6">
          <div className="flex items-center gap-1 small:gap-6">
            <MobileMenu items={menu} brand={brand} />
            <BrandLogo brand={brand} />
            <span aria-hidden className="hidden small:block h-12 w-px bg-accent/50" />
          </div>
          <div className="hidden small:flex flex-1 h-full items-center">
            <MegaMenu items={menu} />
          </div>
          <div className="flex items-center justify-end gap-x-0.5 small:gap-x-2">
            <Search />
            <span className="hidden xsmall:block">
              <WishlistHeaderLink />
            </span>
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
      </header>
    </div>
  )
}
