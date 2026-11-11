"use client"

import { Consent, saveProfile } from "@lib/data/profile"
import { HttpTypes } from "@medusajs/types"
import { useActionState } from "react"

const field = "h-12 w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const label = "mb-1 block text-sm font-semibold text-ink"

const CHANNELS: [keyof Consent, string][] = [
  ["sms", "SMS"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
]

// Profile (ARCHITECTURE.md §11, §14): name, optional email, mobile (login, read-only),
// marketing consent per channel. Order updates are always sent — they're not marketing.
export default function ProfileForm({ customer, consent }: { customer: HttpTypes.StoreCustomer; consent: Consent }) {
  const [state, action, pending] = useActionState(saveProfile, null)
  const phone = customer.phone ? `+91 ${customer.phone.replace(/^\+91/, "")}` : null

  return (
    <form action={action} className="grid gap-5" data-testid="profile-form">
      <div className="grid gap-4 xsmall:grid-cols-2">
        <div>
          <label htmlFor="first_name" className={label}>First name</label>
          <input id="first_name" name="first_name" autoComplete="given-name" defaultValue={customer.first_name ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="last_name" className={label}>Last name</label>
          <input id="last_name" name="last_name" autoComplete="family-name" defaultValue={customer.last_name ?? ""} className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className={label}>Email <span className="font-normal text-ink-muted">(optional — for invoices and order emails)</span></label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={customer.email ?? ""} className={field} />
      </div>
      {phone && (
        <div>
          <p className={label}>Mobile number</p>
          <p className="text-ink">{phone}</p>
          <p className="text-xs text-ink-muted">You sign in with this number, so it can&apos;t be changed here.</p>
        </div>
      )}
      <fieldset className="rounded-lg border border-champagne bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Offers and new collections</legend>
        <p className="mb-3 text-xs text-ink-soft">
          Choose how we may send you festival offers. Untick to stop anytime. Order updates and login codes are always sent.
        </p>
        <div className="grid gap-3">
          {CHANNELS.map(([k, name]) => (
            <label key={k} className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" name={`consent_${k}`} defaultChecked={!!consent[k]} className="h-5 w-5 accent-[#762019]" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      {state && <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-green-800" : "text-red-700"}`}>{state.message}</p>}
      <button disabled={pending} className="h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-50 xsmall:justify-self-start">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}
