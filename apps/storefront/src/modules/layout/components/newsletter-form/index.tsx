"use client"

import { subscribeNewsletter } from "@lib/data/newsletter"
import { useActionState } from "react"

export default function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, null)
  if (state?.ok) return <p role="status" className="text-sm text-ivory">{state.message}</p>

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-3">
      <p className="font-serif text-lg font-semibold text-champagne">Festival offers &amp; new collections</p>
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">Email</label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Your email"
          className="h-11 min-w-0 flex-1 rounded-full border border-champagne/50 bg-white px-4 text-base text-ink focus:border-accent focus:outline-none"
        />
        <button disabled={pending} className="h-11 shrink-0 rounded-full bg-accent px-5 font-semibold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-ivory/90">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#C58A36]" />
        I agree to receive DivineAura emails about new collections and festival offers. I can unsubscribe anytime.
      </label>
      {state && !state.ok && <p role="alert" className="text-xs text-champagne">{state.message}</p>}
    </form>
  )
}
