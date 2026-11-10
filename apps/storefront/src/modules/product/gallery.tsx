"use client"

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

// Product media uploaded in admin. A file ending in .mp4/.webm/.mov plays as video.
const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

const Lotus = () => (
  <svg viewBox="0 0 64 40" aria-hidden className="h-16 w-24 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M32 6c-5 7-5 18 0 28 5-10 5-21 0-28Z" />
    <path d="M32 34c-8-3-15-10-17-21 9 1 15 7 17 21Z" />
    <path d="M32 34c8-3 15-10 17-21-9 1-15 7-17 21Z" />
  </svg>
)

export default function Gallery({ media, title }: { media: string[]; title: string }) {
  const track = useRef<HTMLDivElement>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  if (!media.length) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-champagne bg-gradient-to-b from-ivory to-champagne/60">
        <Lotus />
        <span className="text-sm text-ink-muted">Photos coming soon</span>
      </div>
    )
  }

  const goTo = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }
  const open = (i: number) => {
    setIndex(i)
    setZoomed(false)
    lightbox.current?.showModal()
  }
  const step = (d: number) => {
    setZoomed(false)
    setIndex((i) => (i + d + media.length) % media.length)
  }

  return (
    <div className="flex flex-col gap-3 small:flex-row-reverse">
      <div className="relative min-w-0 flex-1">
        <div
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-lg border border-champagne bg-ivory-deep"
          aria-label={`${title} photos`}
        >
          {media.map((url, i) => (
            <div key={url} className="relative aspect-square w-full shrink-0 snap-center">
              {isVideo(url) ? (
                <video src={url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
              ) : (
                <button type="button" onClick={() => open(i)} className="group absolute inset-0 cursor-zoom-in" aria-label={`Zoom photo ${i + 1}`}>
                  <Image
                    src={url}
                    alt={i === 0 ? title : `${title}, photo ${i + 1}`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <ZoomIn aria-hidden className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/80 p-1.5 text-primary opacity-80" />
                </button>
              )}
            </div>
          ))}
        </div>
        {media.length > 1 && (
          <div className="mt-2 flex justify-center gap-1.5 small:hidden" aria-hidden>
            {media.map((u, i) => (
              <span key={u} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-champagne"}`} />
            ))}
          </div>
        )}
      </div>

      {media.length > 1 && (
        <ul className="hidden w-20 shrink-0 flex-col gap-2 small:flex">
          {media.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-ivory-deep ${i === index ? "border-primary" : "border-transparent hover:border-champagne"}`}
              >
                {isVideo(url) ? (
                  <span className="flex h-full items-center justify-center text-xs font-semibold text-primary">Video</span>
                ) : (
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={lightbox}
        aria-label="Photo zoom"
        onClose={() => setZoomed(false)}
        className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 backdrop:bg-black/80"
      >
        <div className={`h-full w-full ${zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}>
          {!isVideo(media[index]) && (
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
    </div>
  )
}
