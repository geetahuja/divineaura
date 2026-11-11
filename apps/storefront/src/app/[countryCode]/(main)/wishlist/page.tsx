import WishlistView from "@modules/wishlist/wishlist-view"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you saved at DivineAura.",
  robots: { index: false },
}

// Guests: saved in this browser. Logged in: saved to the account (merged on login).
export default function WishlistPage() {
  return (
    <div className="content-container mx-auto max-w-3xl py-8 small:py-12">
      <h1 className="mb-6 font-serif text-3xl font-semibold text-primary small:text-4xl">Wishlist</h1>
      <WishlistView />
    </div>
  )
}
