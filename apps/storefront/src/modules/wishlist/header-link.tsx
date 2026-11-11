"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart } from "lucide-react"
import { useWishlist } from "./context"

// Header heart with the number of saved products.
export default function WishlistHeaderLink() {
  const { ids } = useWishlist()
  return (
    <LocalizedClientLink href="/wishlist" aria-label={`Wishlist, ${ids.length} saved`} className="relative p-2 text-primary hover:text-primary-hover" data-testid="nav-wishlist-link">
      <Heart className="h-5 w-5" aria-hidden />
      {ids.length > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
          {ids.length}
        </span>
      )}
    </LocalizedClientLink>
  )
}
