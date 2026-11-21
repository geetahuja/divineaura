"use client"

import { reduceMotion } from "@lib/util/motion"
import { edgeColour, motionKeyframes, motionTransform, SWAY_MAX, type Motion } from "@lib/util/photo-motion"
import Image from "next/image"
import { useRef, useState } from "react"

/*
 * Last gallery slide: turn the product by dragging or with ←/→.
 *  - `sprite` (Admin metadata spin_sprite: square frames in one row) = real 360° photos.
 *  - otherwise `photo` (the first product photo) turns or sways
 *    (`motion`, lib/util/photo-motion.ts), so every product gets the slide.
 * Loaded only once the slide is shown; moves once on first view (not under
 * reduced motion). Drag: one slide width = one full turn (or the full sway).
 * ponytail: one sprite for card + page caps quality at ~600 px frames
 * (WebP max width 16,383 px ÷ 24 frames); add a separate page sprite if that looks soft.
 */
const EASE = "cubic-bezier(.22,1,.36,1)"

export default function Spin360({
  sprite,
  photo,
  motion,
  active,
  title,
}: {
  sprite?: string | null
  photo?: string | null
  motion: Motion | null
  active: boolean
  title: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const drag = useRef({ x0: -1, d0: 0 })
  const [load, setLoad] = useState(false)
  const [n, setN] = useState(0) // sprite frames
  const [deg, setDeg] = useState(0)
  const [fill, setFill] = useState<string | null>(null)
  if (active && !load) setLoad(true)

  const sway = !sprite && motion === "sway"
  const step = sprite ? 360 / (n || 24) : sway ? 10 : 15
  const ready = sprite ? n > 0 : load
  const turn = (d: number) => {
    const snapped = sprite ? Math.round(d / step) * step : d
    setDeg(sway ? Math.max(-SWAY_MAX, Math.min(SWAY_MAX, snapped)) : ((snapped % 360) + 360) % 360)
  }
  const frame = n ? Math.round(deg / (360 / n)) % n : 0

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={`${title}, ${sprite ? "360° view" : "turning view"}. Drag or use the arrow keys to turn it.`}
      aria-valuemin={sway ? -SWAY_MAX : 0}
      aria-valuemax={sway ? SWAY_MAX : 359}
      aria-valuenow={Math.round(deg)}
      aria-valuetext={ready ? `${Math.round(deg)}°` : "loading"}
      className="absolute inset-0 cursor-grab overflow-hidden bg-ivory-deep active:cursor-grabbing"
      style={{ touchAction: "pan-y", background: fill ?? undefined }}
      onKeyDown={(e) => {
        if (!ready || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return
        e.preventDefault()
        e.stopPropagation() // the gallery uses ←/→ to change slides
        turn(deg + (e.key === "ArrowRight" ? step : -step))
      }}
      onPointerDown={(e) => {
        if (!ready) return
        e.currentTarget.getAnimations({ subtree: true }).forEach((a) => a.cancel())
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x0: e.clientX, d0: deg }
      }}
      onPointerMove={(e) => {
        const { x0, d0 } = drag.current
        if (x0 < 0 || !ready) return
        turn(d0 + ((e.clientX - x0) / box.current!.clientWidth) * (sway ? 2 * SWAY_MAX : 360))
      }}
      onPointerUp={() => (drag.current.x0 = -1)}
      onPointerCancel={() => (drag.current.x0 = -1)}
    >
      {load && sprite && (
        // eslint-disable-next-line @next/next/no-img-element -- sprite strip, not a photo for next/image
        <img
          src={sprite}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute left-0 top-0 h-full w-auto max-w-none select-none"
          style={{ transform: n ? `translateX(${(-frame / n) * 100}%)` : undefined }}
          onLoad={async (e) => {
            const el = e.currentTarget
            // "load" fires before a big sprite is decoded; turning it earlier shows a blank slide.
            await el.decode().catch(() => {})
            const frames = el.naturalHeight ? Math.round(el.naturalWidth / el.naturalHeight) : 0
            if (frames < 2) return
            setN(frames)
            if (!reduceMotion()) {
              el.animate([{ transform: "translateX(0)", easing: `steps(${frames})` }, { transform: "translateX(-100%)" }], {
                duration: 1800,
                easing: EASE,
              })
            }
          }}
        />
      )}
      {load && !sprite && photo && motion && (
        <div ref={layer} className="absolute inset-0 select-none" style={{ transform: deg ? motionTransform(motion, deg) : undefined }}>
          <Image
            src={photo}
            alt=""
            fill
            draggable={false}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            onLoad={(e) => {
              setFill(edgeColour(e.currentTarget))
              if (!reduceMotion() && layer.current) {
                layer.current.animate(motionKeyframes(motion), { duration: 2000, easing: motion === "turn" ? EASE : "linear" })
              }
            }}
          />
        </div>
      )}
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-primary">
        {ready ? "↔ Drag to turn" : "Loading…"}
      </span>
    </div>
  )
}
