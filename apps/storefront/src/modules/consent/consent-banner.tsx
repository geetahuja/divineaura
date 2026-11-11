"use client"

import { Consent, readConsentCookie, saveConsent } from "@lib/consent"
import { useEffect, useRef, useState } from "react"

const btn = "h-11 rounded-full px-5 text-sm font-semibold"

// Cookie banner (DPDP Act): Accept all / Reject / Choose. Nothing optional loads
// until a choice is made; "Cookie settings" in the footer reopens it.
export default function ConsentBanner() {
  // Rendered open on the server so it paints immediately; a tiny inline script in the
  // root layout hides it before paint when a choice is already saved (no flash).
  const [open, setOpen] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const [c, setC] = useState<Consent>({ analytics: false, marketing: false })
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const saved = readConsentCookie()
    if (saved) {
      setC(saved)
      setOpen(false)
    } else document.documentElement.classList.remove("consent-set") // e.g. outdated cookie version
    const reopen = () => {
      setC(readConsentCookie() ?? { analytics: false, marketing: false })
      setChoosing(true)
      setOpen(true)
      document.documentElement.classList.remove("consent-set")
      setTimeout(() => heading.current?.focus(), 50)
    }
    window.addEventListener("da:open-consent", reopen)
    return () => window.removeEventListener("da:open-consent", reopen)
  }, [])

  if (!open) return null
  const done = (choice: Consent) => {
    saveConsent(choice)
    document.documentElement.classList.add("consent-set")
    setOpen(false)
    setChoosing(false)
  }

  return (
    <div id="consent-banner" role="region" aria-labelledby="consent-heading" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[90] px-3 small:bottom-4">
      <div className="mx-auto max-w-2xl rounded-xl border border-champagne bg-white p-4 shadow-lg">
        <h2 id="consent-heading" ref={heading} tabIndex={-1} className="font-serif text-lg font-semibold text-primary outline-none">Your privacy</h2>
        <p className="mt-1 text-sm text-ink-soft">
          We use essential cookies to run the shop (cart, login). With your permission we'd also like to use analytics and marketing cookies to improve the site and our ads.{" "}
          <a href="/policies/privacy" className="font-semibold text-primary underline">Privacy policy</a>
        </p>
        {choosing && (
          <fieldset className="mt-3 grid gap-2 text-sm">
            <legend className="sr-only">Choose cookies</legend>
            <label className="flex items-start gap-3 text-ink-muted">
              <input type="checkbox" checked disabled className="mt-0.5 h-5 w-5" /> <span><strong className="text-ink">Essential</strong> — cart, login and security. Always on.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={c.analytics} onChange={(e) => setC({ ...c, analytics: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#762019]" />
              <span><strong className="text-ink">Analytics</strong> <span className="text-ink-soft">— Google Analytics, to see which pages help customers.</span></span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={c.marketing} onChange={(e) => setC({ ...c, marketing: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#762019]" />
              <span><strong className="text-ink">Marketing</strong> <span className="text-ink-soft">— Meta (Facebook/Instagram) pixel, to measure our ads.</span></span>
            </label>
          </fieldset>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={`${btn} bg-primary text-white hover:bg-primary-hover`} onClick={() => done({ analytics: true, marketing: true })}>Accept all</button>
          <button type="button" className={`${btn} border border-primary text-primary hover:bg-ivory`} onClick={() => done({ analytics: false, marketing: false })}>Reject non-essential</button>
          {choosing ? (
            <button type="button" className={`${btn} border border-champagne text-ink`} onClick={() => done(c)}>Save my choice</button>
          ) : (
            <button type="button" className={`${btn} text-ink underline-offset-2 hover:underline`} onClick={() => setChoosing(true)}>Choose</button>
          )}
        </div>
      </div>
    </div>
  )
}
