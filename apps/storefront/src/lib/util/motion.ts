// True when the visitor asked for less motion: the OS setting or the footer
// "Reduce motion" toggle (html.reduce-motion, see reduce-motion-toggle.tsx).
export const reduceMotion = () =>
  typeof window !== "undefined" &&
  (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion"))
