"use client"

import { reduceMotion } from "@lib/util/motion"
import { useRef, useState } from "react"

/*
 * 360° slide in the product gallery. Same sprite as the card spin
 * (Admin metadata spin_sprite: square frames in one row). Loaded only once the
 * slide is shown, turns once on first view (not under reduced motion), then
 * drag (one card width = one full turn) or ←/→ keys turn it.
 * ponytail: one sprite for card + page caps quality at ~600 px frames
 * (WebP max width 16,383 px ÷ 24 frames); add a separate page sprite if that looks soft.
 */
export default function Spin360({ src, active, title }: { src: string; active: boolean; title: string }) {
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const drag = useRef({ x0: -1, f0: 0 })
  const [load, setLoad] = useState(false)
  const [n, setN] = useState(0)
  const [frame, setFrame] = useState(0)
  if (active && !load) setLoad(true)

  const turn = (k: number) => setFrame(((k % n) + n) % n)

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={`${title}, 360° view. Drag or use the arrow keys to turn it.`}
      aria-valuemin={1}
      aria-valuemax={n || 1}
      aria-valuenow={frame + 1}
      aria-valuetext={n ? `${Math.round((frame / n) * 360)}°` : "loading"}
      className="absolute inset-0 cursor-grab overflow-hidden bg-ivory-deep active:cursor-grabbing"
      style={{ touchAction: "pan-y" }}
      onKeyDown={(e) => {
        if (!n || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return
        e.preventDefault()
        e.stopPropagation() // the gallery uses ←/→ to change slides
        turn(frame + (e.key === "ArrowRight" ? 1 : -1))
      }}
      onPointerDown={(e) => {
        if (!n) return
        img.current?.getAnimations().forEach((a) => a.cancel())
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x0: e.clientX, f0: frame }
      }}
      onPointerMove={(e) => {
        const { x0, f0 } = drag.current
        if (x0 < 0 || !n) return
        turn(f0 + Math.round(((e.clientX - x0) / box.current!.clientWidth) * n))
      }}
      onPointerUp={() => (drag.current.x0 = -1)}
      onPointerCancel={() => (drag.current.x0 = -1)}
    >
      {load && (
        // eslint-disable-next-line @next/next/no-img-element -- sprite strip, not a photo for next/image
        <img
          ref={img}
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute left-0 top-0 h-full w-auto max-w-none select-none"
          style={{ transform: n ? `translateX(${(-frame / n) * 100}%)` : undefined }}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            const frames = h ? Math.round(w / h) : 0
            if (frames < 2) return
            setN(frames)
            if (!reduceMotion()) {
              e.currentTarget.animate(
                [{ transform: "translateX(0)", easing: `steps(${frames})` }, { transform: "translateX(-100%)" }],
                { duration: 1800, easing: "cubic-bezier(.22,1,.36,1)" }
              )
            }
          }}
        />
      )}
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-primary">
        {n ? "↔ Drag to turn" : "Loading 360° view…"}
      </span>
    </div>
  )
}
