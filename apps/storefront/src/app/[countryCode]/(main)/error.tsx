"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect } from "react"

// Branded "something went wrong" (500) inside the site layout, with a retry.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="content-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="font-serif text-6xl font-semibold text-accent" aria-hidden>ॐ</p>
      <h1 className="font-serif text-3xl font-semibold text-primary">Something went wrong</h1>
      <p className="max-w-md text-ink-soft">We couldn't load this page just now. Please try again — your cart is safe.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover">Try again</button>
        <LocalizedClientLink href="/" className="flex h-12 items-center rounded-full border border-primary px-6 font-semibold text-primary hover:bg-ivory">Go to the homepage</LocalizedClientLink>
      </div>
      {error.digest && <p className="text-xs text-ink-muted">Reference: {error.digest}</p>}
    </div>
  )
}
