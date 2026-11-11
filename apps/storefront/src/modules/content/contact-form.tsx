"use client"

import { sendContact } from "@lib/data/content"
import { useActionState } from "react"

const field = "w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const label = "mb-1 block text-sm font-semibold text-ink"

// Contact form → support inbox via the messaging layer (+ acknowledgement email).
export default function ContactForm({ supportEmail }: { supportEmail: string | null }) {
  const [state, action, pending] = useActionState(sendContact, null)
  if (state?.ok) return <p role="status" className="mt-8 rounded-lg bg-green-50 p-4 text-green-800">{state.message}</p>

  return (
    <form action={action} className="mt-8 grid gap-4 rounded-lg border border-champagne bg-white p-5 xsmall:grid-cols-2" aria-labelledby="contact-form-heading">
      <h2 id="contact-form-heading" className="font-serif text-2xl font-semibold text-primary xsmall:col-span-2">Send us a message</h2>
      <div className="xsmall:col-span-2">
        <label htmlFor="c-name" className={label}>Your name</label>
        <input id="c-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className={`${field} h-12`} />
      </div>
      <div>
        <label htmlFor="c-email" className={label}>Email</label>
        <input id="c-email" name="email" type="email" autoComplete="email" className={`${field} h-12`} aria-describedby="c-contact-help" />
      </div>
      <div>
        <label htmlFor="c-phone" className={label}>Mobile</label>
        <input id="c-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} className={`${field} h-12`} aria-describedby="c-contact-help" />
      </div>
      <p id="c-contact-help" className="-mt-2 text-xs text-ink-muted xsmall:col-span-2">Give at least one so we can reply.</p>
      <div>
        <label htmlFor="c-order" className={label}>Order number <span className="font-normal text-ink-muted">(optional)</span></label>
        <input id="c-order" name="order_number" inputMode="numeric" className={`${field} h-12`} />
      </div>
      <div>
        <label htmlFor="c-topic" className={label}>About</label>
        <select id="c-topic" name="topic" className={`${field} h-12`} defaultValue="order">
          <option value="order">An order</option>
          <option value="product">A product</option>
          <option value="return">Return or refund</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="xsmall:col-span-2">
        <label htmlFor="c-message" className={label}>Message</label>
        <textarea id="c-message" name="message" required minLength={10} maxLength={2000} rows={5} className={`${field} py-2`} />
      </div>
      {/* Spam trap: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-red-700 xsmall:col-span-2">{state.message}</p>}
      <div className="flex flex-wrap items-center gap-3 xsmall:col-span-2">
        <button disabled={pending} className="h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {pending ? "Sending…" : "Send message"}
        </button>
        {supportEmail && (
          <p className="text-sm text-ink-soft">
            or email <a className="font-semibold text-primary hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        )}
      </div>
    </form>
  )
}
