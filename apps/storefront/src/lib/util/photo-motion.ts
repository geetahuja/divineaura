/*
 * Motion made from a product's ordinary photo, so every product moves without
 * turntable photos (card hover spin + the product page "Turn" slide).
 *   turn – flat-lay pieces (bracelets, hand ties, malas) rotate in place, like a
 *          turntable seen from above.
 *   sway – everything else (lockets, bottles, boxes) twists left and right in 3D
 *          and never shows a back, so deity images / Om are never mirrored.
 * Admin → product → Metadata `motion` = turn | sway | none overrides the category
 * rule. A real turntable sprite (metadata `spin_sprite`) is used instead when set.
 */
export type Motion = "turn" | "sway"

const TURN_CATEGORIES = new Set(["bracelets", "hand-ties", "malas"])
export const SWAY_MAX = 50 // degrees each way

export function photoMotion(categoryHandles: string[], override?: unknown): Motion | null {
  if (override === "turn" || override === "sway") return override
  if (override === "none") return null
  return categoryHandles.some((h) => TURN_CATEGORIES.has(h)) ? "turn" : "sway"
}

export const motionTransform = (m: Motion, deg: number) =>
  m === "turn" ? `rotate(${deg}deg)` : `perspective(900px) rotateY(${deg}deg)`

// One showcase cycle (Web Animations keyframes): a full turn, or right → left → front.
export const motionKeyframes = (m: Motion): Keyframe[] =>
  m === "turn"
    ? [{ transform: motionTransform(m, 0) }, { transform: motionTransform(m, 360) }]
    : [0, SWAY_MAX, 0, -SWAY_MAX, 0].map((d) => ({ transform: motionTransform(m, d), easing: "ease-in-out" }))

// The photo's own background colour (top-left pixel), shown behind it while it
// moves so the uncovered corners blend in. null if the image can't be read.
export function edgeColour(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement("canvas")
    c.width = c.height = 1
    const ctx = c.getContext("2d")
    if (!ctx || !img.naturalWidth) return null
    ctx.drawImage(img, 2, 2, 1, 1, 0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return `rgb(${d[0]} ${d[1]} ${d[2]})`
  } catch {
    return null
  }
}
