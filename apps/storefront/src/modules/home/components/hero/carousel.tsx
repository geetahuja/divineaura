"use client"

import { Children, useEffect, useRef, useState } from "react"

/**
 * CSS scroll-snap carousel: swipe on phones, dots everywhere, auto-advance every
 * 7 s (paused on hover/focus, off with prefers-reduced-motion). Slides are
 * server-rendered, so the first one paints without JavaScript.
 */
export default function HeroCarousel({ count, children }: { count: number; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setActive(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setTimeout(() => go((active + 1) % count), 7000)
    return () => clearTimeout(t)
  }, [active, paused, count])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative border-b border-champagne"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {Children.map(children, (child, i) => (
          <div className="w-full shrink-0 snap-center" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={i !== active} inert={i !== active || undefined}>
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === active}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span className={`block h-2.5 w-2.5 rounded-full transition-colors ${i === active ? "bg-primary" : "bg-primary/30"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
