"use client"

import { Heart } from "lucide-react"
import { reduceMotion } from "@lib/util/motion"
import { useWishlist } from "./context"

// Saving: the heart bounces and six gold sparks fly out (removing: no burst).
function burst(button: HTMLElement) {
  if (reduceMotion()) return
  button.querySelector("svg")?.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }], {
    duration: 450,
    easing: "ease-out",
  })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI
    const dot = document.createElement("span")
    dot.setAttribute("aria-hidden", "true")
    dot.className = "pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -ml-[3px] -mt-[3px] rounded-full bg-accent"
    button.append(dot)
    dot.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * 18}px, ${Math.sin(a) * 18}px) scale(0.4)`, opacity: 0 },
      ],
      { duration: 500, easing: "cubic-bezier(.22,1,.36,1)" }
    ).onfinish = () => dot.remove()
  }
}

// Heart toggle on product cards (overlay) and the product page (with text).
export default function HeartButton({ productId, title, variant = "card" }: { productId: string; title: string; variant?: "card" | "page" }) {
  const w = useWishlist()
  const on = w.has(productId)
  const label = on ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`

  if (variant === "page") {
    return (
      <button
        type="button"
        onClick={(e) => {
          if (!on) burst(e.currentTarget)
          w.toggle(productId)
        }}
        aria-pressed={on}
        aria-label={label}
        className="relative inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary px-5 font-semibold text-primary hover:bg-ivory"
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
        if (!on) burst(e.currentTarget)
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
