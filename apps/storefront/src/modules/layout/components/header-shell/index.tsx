"use client"

import { useEffect, useState } from "react"

/**
 * The header bar. On the homepage (it has #home-hero) it is transparent over the
 * hero photo until the page is scrolled; everywhere else it is solid ivory.
 * Children stay server components.
 */
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const [atTop, setAtTop] = useState(true)
  useEffect(() => {
    const on = () => setAtTop(window.scrollY < 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  return (
    <header
      data-top={atTop || undefined}
      className="border-b border-champagne bg-ivory transition-colors duration-300 [body:has(#home-hero)_&[data-top]]:border-transparent [body:has(#home-hero)_&[data-top]]:bg-transparent"
    >
      {children}
    </header>
  )
}
