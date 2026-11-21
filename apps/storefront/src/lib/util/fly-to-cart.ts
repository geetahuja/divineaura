import { reduceMotion } from "./motion"

/*
 * After a successful add to cart: a round copy of the product photo arcs into
 * the visible cart icon ([data-cart-icon]), which then pops. Fire-and-forget,
 * purely visual – the cart is already updated. Reduced motion: nothing.
 */
export function flyToCart(img: HTMLImageElement | null | undefined) {
  if (reduceMotion()) return
  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-icon]")).find((e) => e.getBoundingClientRect().width > 0)
  if (!target) return
  const pop = () =>
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" })

  const from = img?.getBoundingClientRect()
  // No photo, or it has scrolled off screen (phone, at the buy buttons): just pop the icon.
  if (!img || !from?.width || from.bottom < 0 || from.top > innerHeight) return void pop()
  const to = target.getBoundingClientRect()
  const size = Math.min(from.width, from.height, 160)
  const ghost = document.createElement("img")
  ghost.src = img.currentSrc || img.src
  ghost.alt = ""
  ghost.setAttribute("aria-hidden", "true")
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "9999px",
    boxShadow: "0 8px 24px rgb(74 19 15 / 0.25)",
    zIndex: "100",
    pointerEvents: "none",
  })
  document.body.append(ghost)
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(0.55)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.3 },
    ],
    { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" }
  )
  flight.onfinish = flight.oncancel = () => {
    ghost.remove()
    pop()
  }
}
