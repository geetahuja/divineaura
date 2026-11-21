"use client"

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"
import Image from "next/image"
import { useRef, useState, ViewTransition } from "react"
import Spin360 from "./spin-360"
import { reduceMotion } from "@lib/util/motion"

// Product media uploaded in admin. A file ending in .mp4/.webm/.mov plays as video.
const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

const Lotus = () => (
  <svg viewBox="0 0 64 40" aria-hidden className="h-16 w-24 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M32 6c-5 7-5 18 0 28 5-10 5-21 0-28Z" />
    <path d="M32 34c-8-3-15-10-17-21 9 1 15 7 17 21Z" />
    <path d="M32 34c8-3 15-10 17-21-9 1-15 7-17 21Z" />
  </svg>
)

/*
 * Photos (+ videos), then an optional 360° slide (spin sprite). The frame shares
 * the view-transition name of the product's card, so a card click morphs into it.
 */
export default function Gallery({ id, media, spin, title }: { id: string; media: string[]; spin?: string | null; title: string }) {
  const track = useRef<HTMLDivElement>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  // Desktop magnifier: which photo, and where the cursor is (in %).
  const [lens, setLens] = useState<{ i: number; x: number; y: number } | null>(null)
  const morph = `product-${id}`
  const count = media.length + (spin ? 1 : 0)

  if (!count) {
    return (
      <ViewTransition name={morph} share="morph" default="none">
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-champagne bg-gradient-to-b from-ivory to-champagne/60">
          <Lotus />
          <span className="text-sm text-ink-muted">Photos coming soon</span>
        </div>
      </ViewTransition>
    )
  }

  const goTo = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: reduceMotion() ? "auto" : "smooth" })
  }
  const open = (i: number) => {
    setIndex(i)
    setZoomed(false)
    setLens(null)
    lightbox.current?.showModal()
  }
  const step = (d: number) => {
    setZoomed(false)
    setIndex((i) => (i + d + media.length) % media.length)
  }
  const label = (i: number) => (i === media.length ? "360° view" : `photo ${i + 1}`)

  return (
    <div className="flex flex-col gap-3 small:flex-row-reverse">
      <div className="relative min-w-0 flex-1">
        <ViewTransition name={morph} share="morph" default="none">
          <div
            ref={track}
            data-product-gallery
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={`${title} photos. Use the arrow keys to change photo.`}
            onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
              e.preventDefault()
              goTo(Math.min(count - 1, Math.max(0, index + (e.key === "ArrowRight" ? 1 : -1))))
            }}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-lg border border-champagne bg-ivory-deep"
          >
            {media.map((url, i) => (
              <div key={url} className="relative aspect-square w-full shrink-0 snap-center overflow-hidden">
                {isVideo(url) ? (
                  <video src={url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                ) : (
                  <button
                    type="button"
                    onClick={() => open(i)}
                    onPointerMove={(e) => {
                      if (e.pointerType !== "mouse" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return
                      const r = e.currentTarget.getBoundingClientRect()
                      setLens({ i, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
                    }}
                    onPointerLeave={() => setLens(null)}
                    className="group absolute inset-0 cursor-zoom-in"
                    aria-label={`Zoom photo ${i + 1}`}
                  >
                    <Image
                      src={url}
                      alt={i === 0 ? title : `${title}, photo ${i + 1}`}
                      fill
                      priority={i === 0}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                    {lens?.i === i && (
                      // eslint-disable-next-line @next/next/no-img-element -- full-resolution original, fetched only on hover
                      <img
                        src={url}
                        alt=""
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        style={{ transform: "scale(2)", transformOrigin: `${lens.x}% ${lens.y}%` }}
                      />
                    )}
                    <ZoomIn aria-hidden className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/80 p-1.5 text-primary opacity-80" />
                  </button>
                )}
              </div>
            ))}
            {spin && (
              <div className="relative aspect-square w-full shrink-0 snap-center">
                <Spin360 src={spin} active={index === media.length} title={title} />
              </div>
            )}
          </div>
        </ViewTransition>
        <p className="sr-only" aria-live="polite">
          {count > 1 ? `${index === media.length ? "360° view" : `Image ${index + 1}`} of ${count}` : ""}
        </p>
        {count > 1 && (
          <div className="mt-1 flex justify-center small:hidden">
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Show ${label(i)}`} className="p-1.5">
                <span className={`block h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-champagne"}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {count > 1 && (
        <ul className="hidden w-20 shrink-0 flex-col gap-2 small:flex">
          {[...media, ...(spin ? [spin] : [])].map((url, i) => (
            <li key={url + i}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${label(i)}`}
                aria-current={i === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-ivory-deep ${i === index ? "border-primary" : "border-transparent hover:border-champagne"}`}
              >
                {i === media.length ? (
                  <span className="flex h-full items-center justify-center font-serif text-lg font-semibold text-primary">360°</span>
                ) : isVideo(url) ? (
                  <span className="flex h-full items-center justify-center text-xs font-semibold text-primary">Video</span>
                ) : (
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {media.length > 0 && (
        <dialog
          ref={lightbox}
          aria-label="Photo zoom"
          onClose={() => setZoomed(false)}
          className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 backdrop:bg-black/80"
        >
          <div className={`h-full w-full ${zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}>
            {media[index] && !isVideo(media[index]) && (
              // eslint-disable-next-line @next/next/no-img-element -- full-resolution original for zooming
              <img
                src={media[index]}
                alt={title}
                onClick={() => setZoomed((z) => !z)}
                className={zoomed ? "w-[200%] max-w-none cursor-zoom-out small:w-auto" : "max-h-full max-w-full cursor-zoom-in object-contain"}
              />
            )}
          </div>
          <button type="button" onClick={() => lightbox.current?.close()} aria-label="Close" className="fixed right-3 top-3 rounded-full bg-white/90 p-2 text-ink">
            <X className="h-5 w-5" />
          </button>
          {media.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="fixed left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="fixed right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <p className="pointer-events-none fixed bottom-4 left-0 right-0 text-center text-xs text-white/80">
            Tap the photo to {zoomed ? "zoom out" : "zoom in"} · {index + 1} / {media.length}
          </p>
        </dialog>
      )}
    </div>
  )
}
