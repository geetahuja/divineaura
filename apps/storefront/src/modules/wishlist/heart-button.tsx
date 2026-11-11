"use client"

import { Heart } from "lucide-react"
import { useWishlist } from "./context"

// Heart toggle on product cards (overlay) and the product page (with text).
export default function HeartButton({ productId, title, variant = "card" }: { productId: string; title: string; variant?: "card" | "page" }) {
  const w = useWishlist()
  const on = w.has(productId)
  const label = on ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`

  if (variant === "page") {
    return (
      <button
        type="button"
        onClick={() => w.toggle(productId)}
        aria-pressed={on}
        aria-label={label}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary px-5 font-semibold text-primary hover:bg-ivory"
        data-testid="wishlist-toggle"
      >
        <Heart className={`h-5 w-5 ${on ? "fill-primary" : ""}`} aria-hidden />
        {on ? "Saved" : "Save"}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault() // the card is a link
        w.toggle(productId)
      }}
      aria-pressed={on}
      aria-label={label}
      className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm hover:bg-white"
      data-testid="wishlist-toggle"
    >
      <Heart className={`h-5 w-5 ${on ? "fill-primary" : ""}`} aria-hidden />
    </button>
  )
}
