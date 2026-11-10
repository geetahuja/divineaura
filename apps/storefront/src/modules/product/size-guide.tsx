"use client"

import { Ruler, X } from "lucide-react"
import { useRef } from "react"

// ponytail: one size chart for all bracelets. CONFIRM these with your actual
// bracelet lengths before launch; per-product charts can come later if needed.
const SIZES = [
  { size: "S", wrist: "14 – 15.5 cm", fits: "Slim wrist" },
  { size: "M", wrist: "15.5 – 17 cm", fits: "Most adults" },
  { size: "L", wrist: "17 – 18.5 cm", fits: "Broad wrist" },
]

export default function SizeGuide() {
  const ref = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline">
        <Ruler className="h-4 w-4" aria-hidden />
        Size guide
      </button>
      <dialog
        ref={ref}
        aria-labelledby="size-guide-title"
        className="m-0 mt-auto max-h-[90vh] w-full max-w-none rounded-t-2xl bg-ivory p-0 text-ink backdrop:bg-ink/40 small:m-auto small:max-w-lg small:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-champagne px-5 py-3">
          <h2 id="size-guide-title" className="font-serif text-2xl font-semibold text-primary">Bracelet size guide</h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close size guide" className="p-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <section>
            <h3 className="mb-2 font-semibold">How to measure your wrist</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-ink-soft">
              <li>Wrap a soft measuring tape (or a strip of paper) around your wrist, just below the wrist bone.</li>
              <li>Keep it snug but not tight. If you used paper, mark where it overlaps and measure it against a ruler.</li>
              <li>Note the length in centimetres and pick your size from the table below.</li>
              <li>Between two sizes, or prefer a loose fit? Choose the larger size.</li>
            </ol>
          </section>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Bracelet sizes by wrist measurement</caption>
            <thead>
              <tr className="border-b border-champagne text-xs uppercase tracking-wide text-ink-muted">
                <th scope="col" className="py-2">Size</th>
                <th scope="col" className="py-2">Wrist</th>
                <th scope="col" className="py-2">Usually fits</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s) => (
                <tr key={s.size} className="border-b border-champagne/60">
                  <td className="py-2 font-semibold text-primary">{s.size}</td>
                  <td className="py-2">{s.wrist}</td>
                  <td className="py-2 text-ink-soft">{s.fits}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-muted">Elastic bracelets stretch slightly to slip over the hand.</p>
        </div>
      </dialog>
    </>
  )
}
