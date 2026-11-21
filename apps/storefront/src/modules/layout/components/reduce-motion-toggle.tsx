"use client"

import { useSyncExternalStore } from "react"

// Footer switch for visitors who don't know the OS "reduce motion" setting.
// Sets html.reduce-motion (restored before paint in app/layout.tsx); CSS and
// lib/util/motion.ts treat it exactly like prefers-reduced-motion: reduce.
const EVENT = "reduce-motion-change"
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}
const isOn = () => document.documentElement.classList.contains("reduce-motion")

export default function ReduceMotionToggle() {
  const on = useSyncExternalStore(subscribe, isOn, () => false)
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        document.documentElement.classList.toggle("reduce-motion", !on)
        try {
          if (on) localStorage.removeItem("reduce-motion")
          else localStorage.setItem("reduce-motion", "1")
        } catch {}
        window.dispatchEvent(new Event(EVENT))
      }}
      className="underline hover:text-white"
    >
      Reduce motion: {on ? "on" : "off"}
    </button>
  )
}
