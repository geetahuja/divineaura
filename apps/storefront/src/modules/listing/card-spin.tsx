"use client"

import { reduceMotion } from "@lib/util/motion"
import { useEffect, useRef, useState } from "react"

/*
 * Turntable spin over a product card image. `src` is one sprite: N square
 * frames in a single row (frame count = width ÷ height). Nothing is fetched
 * until intent: 150 ms mouse hover, or (touch screens) the card sitting ≥60 %
 * in view near the middle, once per card per session. Mouse moves scrub the
 * frames after the spin; on touch a sideways drag scrubs (vertical scroll
 * still works). Off under reduced motion and Save-Data.
 */
const EASE = "cubic-bezier(.22,1,.36,1)"

const motionOk = () =>
  !reduceMotion() &&
  !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

export default function CardSpin({ src, id }: { src: string; id: string }) {
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [load, setLoad] = useState(false)
  const [shown, setShown] = useState(false)
  // Mutable per-card state read by event handlers (never rendered).
  const S = useRef({ n: 0, frame: 0, playing: false, pending: false, hover: false, timer: 0, x0: -1, f0: 0, dragged: false })

  const setFrame = (k: number) => {
    S.current.frame = k
    if (img.current) img.current.style.transform = `translateX(${(-k / S.current.n) * 100}%)`
  }

  const play = () => {
    const el = img.current
    if (!el || !S.current.n) return void (S.current.pending = true)
    S.current.pending = false
    S.current.playing = true
    setFrame(0)
    setShown(true)
    // Per-keyframe steps() snaps to whole frames; the effect easing slows the turn at the end.
    const anim = el.animate(
      [{ transform: "translateX(0)", easing: `steps(${S.current.n})` }, { transform: "translateX(-100%)" }],
      { duration: 1400, easing: EASE }
    )
    anim.onfinish = anim.oncancel = () => {
      S.current.playing = false
      if (!S.current.hover) setShown(false)
    }
  }

  // Touch screens: one spin when the card settles in the middle of the screen.
  useEffect(() => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches || !motionOk() || !box.current) return
    const key = `spun:${id}`
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        try {
          if (sessionStorage.getItem(key)) return
          sessionStorage.setItem(key, "1")
        } catch {}
        setLoad(true)
        S.current.pending = true
      },
      { threshold: 0.6, rootMargin: "-20% 0px -20% 0px" }
    )
    io.observe(box.current)
    return () => io.disconnect()
  }, [id])

  useEffect(() => () => clearTimeout(S.current.timer), [])

  const frameAt = (x: number) => {
    const w = box.current!.clientWidth
    return Math.min(S.current.n - 1, Math.max(0, Math.floor((x / w) * S.current.n)))
  }

  return (
    <div
      ref={box}
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !motionOk()) return
        S.current.hover = true
        S.current.timer = window.setTimeout(() => {
          setLoad(true)
          play()
        }, 150)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return
        S.current.hover = false
        clearTimeout(S.current.timer)
        S.current.pending = false
        if (S.current.playing) return // onfinish hides it
        const k = S.current.frame
        if (k && img.current) {
          // Ease back to the front frame, one frame at a time.
          img.current.animate([{ transform: img.current.style.transform, easing: `steps(${k})` }, { transform: "translateX(0)" }], {
            duration: 40 * k,
            easing: EASE,
          })
        }
        setFrame(0)
        setShown(false)
      }}
      onPointerMove={(e) => {
        if (!S.current.n || S.current.playing) return
        const x = e.clientX - box.current!.getBoundingClientRect().left
        if (e.pointerType === "mouse") {
          if (S.current.hover) setFrame(frameAt(x))
        } else if (S.current.x0 >= 0) {
          const dx = x - S.current.x0
          if (Math.abs(dx) > 10) S.current.dragged = true
          if (S.current.dragged) {
            setShown(true)
            const k = Math.round(S.current.f0 + (dx / box.current!.clientWidth) * S.current.n)
            setFrame(((k % S.current.n) + S.current.n) % S.current.n)
          }
        }
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" || !motionOk()) return
        setLoad(true)
        S.current.x0 = e.clientX - box.current!.getBoundingClientRect().left
        S.current.f0 = S.current.frame
        S.current.dragged = false
      }}
      onPointerUp={() => {
        S.current.x0 = -1
        if (!S.current.playing) setShown(false)
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
      {load && (
        // eslint-disable-next-line @next/next/no-img-element -- sprite strip, not a photo for next/image
        <img
          ref={img}
          src={src}
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
