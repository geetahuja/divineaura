"use client"

import { sendPrivacyRequest } from "@lib/data/content"
import { useActionState } from "react"

const field = "w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const label = "mb-1 block text-sm font-semibold text-ink"

// DPDP Act: ask for your data to be deleted, copied or corrected → admin task + email.
export default function PrivacyRequestForm() {
  const [state, action, pending] = useActionState(sendPrivacyRequest, null)
  return (
    <section aria-labelledby="privacy-request-heading" className="mt-10 rounded-lg border border-champagne bg-white p-5" id="data-request">
      <h2 id="privacy-request-heading" className="font-serif text-2xl font-semibold text-primary">Request your data, or ask us to delete it</h2>
      {state?.ok ? (
        <p role="status" className="mt-3 rounded-md bg-green-50 p-3 text-green-800">{state.message}</p>
      ) : (
        <form action={action} className="mt-4 grid gap-4 xsmall:grid-cols-2">
          <div className="xsmall:col-span-2">
            <label htmlFor="pr-kind" className={label}>I want to</label>
            <select id="pr-kind" name="kind" className={`${field} h-12`} defaultValue="delete_data">
              <option value="delete_data">Delete my personal data</option>
              <option value="access_data">Get a copy of my personal data</option>
              <option value="correct_data">Correct my personal data</option>
            </select>
          </div>
          <div className="xsmall:col-span-2">
            <label htmlFor="pr-name" className={label}>Your name</label>
            <input id="pr-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className={`${field} h-12`} />
          </div>
          <div>
            <label htmlFor="pr-email" className={label}>Email used with us</label>
            <input id="pr-email" name="email" type="email" autoComplete="email" className={`${field} h-12`} />
          </div>
          <div>
            <label htmlFor="pr-phone" className={label}>Mobile used with us</label>
            <input id="pr-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} className={`${field} h-12`} />
          </div>
          <div className="xsmall:col-span-2">
            <label htmlFor="pr-details" className={label}>Anything we should know <span className="font-normal text-ink-muted">(optional)</span></label>
            <textarea id="pr-details" name="details" maxLength={1000} rows={3} className={`${field} py-2`} />
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="pr-website">Website</label>
            <input id="pr-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <p className="text-xs text-ink-muted xsmall:col-span-2">
            We'll confirm it's you before acting. Records we must keep by law (such as GST invoices) can't be deleted; we'll tell you what we keep and why.
          </p>
          {state && !state.ok && <p role="alert" className="text-sm text-red-700 xsmall:col-span-2">{state.message}</p>}
          <button disabled={pending} className="h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-50 xsmall:justify-self-start">
            {pending ? "Sending…" : "Send request"}
          </button>
        </form>
      )}
    </section>
  )
}
