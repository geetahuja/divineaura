"use client"

import { reduceMotion } from "@lib/util/motion"
import { edgeColour, motionKeyframes, motionTransform, SWAY_MAX, type Motion } from "@lib/util/photo-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"

/*
 * Moves the product photo on a card (wraps the card's <Image>).
 *  - With a turntable sprite (`sprite`: N square frames in one row, frame count =
 *    width ÷ height) the real frames play; nothing is fetched until intent.
 *  - Otherwise the photo itself turns or sways (`motion`, lib/util/photo-motion.ts),
 *    so every product with one ordinary photo moves.
 * Intent: 150 ms mouse hover, or (touch screens) the card sitting ≥60 % in view
 * near the middle, once per card per session. The mouse then scrubs; on touch a
 * sideways drag scrubs (vertical scroll still works). Off under reduced motion
 * and Save-Data.
 */
const EASE = "cubic-bezier(.22,1,.36,1)"

const motionOk = () =>
  !reduceMotion() && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

export default function CardMotion({
  id,
  sprite,
  motion,
  children,
}: {
  id: string
  sprite: string | null
  motion: Motion | null
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [load, setLoad] = useState(false)
  const [shown, setShown] = useState(false)
  const S = useRef({ n: 0, deg: 0, playing: false, pending: false, hover: false, timer: 0, x0: -1, d0: 0, dragged: false })
  const active = !!sprite || !!motion
  const sway = !sprite && motion === "sway"

  // deg: 0–360 for sprites and "turn", −SWAY_MAX…SWAY_MAX for "sway".
  const apply = (deg: number) => {
    const s = S.current
    s.deg = deg
    if (sprite) {
      if (img.current && s.n) {
        const k = ((Math.round((deg / 360) * s.n) % s.n) + s.n) % s.n
        img.current.style.transform = `translateX(${(-k / s.n) * 100}%)`
      }
    } else if (motion && photo.current) {
      photo.current.style.transform = deg ? motionTransform(motion, deg) : ""
    }
  }

  // Behind a moving photo: its own background colour, so uncovered corners blend in.
  const fillBehind = () => {
    const pic = photo.current?.querySelector("img")
    const colour = !sprite && pic?.complete ? edgeColour(pic) : null
    if (colour && box.current) box.current.style.background = colour
  }

  const play = () => {
    const s = S.current
    const el = sprite ? img.current : photo.current
    if (!el || (sprite && !s.n)) return void (s.pending = true)
    s.pending = false
    s.playing = true
    apply(0)
    setShown(true)
    fillBehind()
    // Sprite: per-keyframe steps() snaps to whole frames; the effect easing slows the turn at the end.
    const anim = sprite
      ? el.animate([{ transform: "translateX(0)", easing: `steps(${s.n})` }, { transform: "translateX(-100%)" }], { duration: 1400, easing: EASE })
      : el.animate(motionKeyframes(motion!), { duration: motion === "turn" ? 1600 : 1800, easing: motion === "turn" ? EASE : "linear" })
    anim.onfinish = anim.oncancel = () => {
      s.playing = false
      if (!s.hover) setShown(false)
    }
  }

  const rest = () => {
    const s = S.current
    const d = s.deg
    const el = sprite ? img.current : photo.current
    if (d && el) {
      if (sprite) {
        const k = ((Math.round((d / 360) * s.n) % s.n) + s.n) % s.n
        if (k) el.animate([{ transform: el.style.transform, easing: `steps(${k})` }, { transform: "translateX(0)" }], { duration: 40 * k, easing: EASE })
      } else {
        const end = motion === "turn" && d > 180 ? 360 : 0 // shortest way back to the front
        el.animate([{ transform: motionTransform(motion!, d) }, { transform: motionTransform(motion!, end) }], { duration: 250, easing: EASE })
      }
    }
    apply(0)
    setShown(false)
  }

  // Touch screens: one spin when the card settles in the middle of the screen.
  useEffect(() => {
    if (!active || matchMedia("(hover: hover) and (pointer: fine)").matches || !motionOk() || !box.current) return
    const key = `spun:${id}`
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        try {
          if (sessionStorage.getItem(key)) return
          sessionStorage.setItem(key, "1")
        } catch {}
        if (sprite) setLoad(true)
        play()
      },
      { threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    )
    io.observe(box.current)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play reads refs; set up once per card
  }, [id, active])

  useEffect(() => () => clearTimeout(S.current.timer), [])

  if (!active) return <>{children}</>

  return (
    <div
      ref={box}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !motionOk()) return
        S.current.hover = true
        S.current.timer = window.setTimeout(() => {
          if (sprite) setLoad(true)
          play()
        }, 150)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return
        S.current.hover = false
        clearTimeout(S.current.timer)
        S.current.pending = false
        if (!S.current.playing) rest() // else onfinish hides it
      }}
      onPointerMove={(e) => {
        const s = S.current
        if ((sprite && !s.n) || s.playing) return
        const w = box.current!.clientWidth
        const x = e.clientX - box.current!.getBoundingClientRect().left
        if (e.pointerType === "mouse") {
          if (!s.hover) return
          const f = Math.min(1, Math.max(0, x / w))
          apply(sway ? (f - 0.5) * 2 * SWAY_MAX : f * 360)
        } else if (s.x0 >= 0) {
          const dx = x - s.x0
          if (Math.abs(dx) > 10) s.dragged = true
          if (s.dragged) {
            setShown(true)
            const d = s.d0 + (dx / w) * (sway ? 2 * SWAY_MAX : 360)
            apply(sway ? Math.max(-SWAY_MAX, Math.min(SWAY_MAX, d)) : ((d % 360) + 360) % 360)
          }
        }
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" || !motionOk()) return
        if (sprite) setLoad(true)
        fillBehind()
        S.current.x0 = e.clientX - box.current!.getBoundingClientRect().left
        S.current.d0 = S.current.deg
        S.current.dragged = false
      }}
      onPointerUp={() => {
        S.current.x0 = -1
        if (!S.current.playing && S.current.dragged) rest()
      }}
      onPointerCancel={() => (S.current.x0 = -1)}
      // A drag is not a tap: don't open the product page.
      onClickCapture={(e) => {
        if (S.current.dragged) {
          e.preventDefault()
          S.current.dragged = false
        }
      }}
    >
      <div ref={photo} className="absolute inset-0">
        {children}
      </div>
      {sprite && load && (
        // eslint-disable-next-line @next/next/no-img-element -- sprite strip, not a photo for next/image
        <img
          ref={img}
          src={sprite}
          alt=""
          draggable={false}
          decoding="async"
          className={`absolute left-0 top-0 h-full w-auto max-w-none bg-ivory-deep transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
          onLoad={async (e) => {
            const el = e.currentTarget
            // "load" fires before a big sprite is decoded; showing it earlier flashes an empty card.
            await el.decode().catch(() => {})
            const { naturalWidth: w, naturalHeight: h } = el
            S.current.n = h ? Math.round(w / h) : 0
            if (S.current.n < 2) S.current.n = 0 // not a sprite: keep the still photo
            else if (S.current.pending) play()
          }}
        />
      )}
    </div>
  )
}
