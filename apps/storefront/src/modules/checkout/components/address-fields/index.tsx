"use client"

import { INDIAN_STATES } from "@lib/util/india-address"

export const field =
  "h-12 w-full rounded-md border border-champagne bg-white px-3 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none"
export const labelCls = "mb-1 block text-sm font-semibold text-ink"

type Values = Record<string, string>

// Name + Indian address. India is the only country (hidden field); the server
// re-validates everything in setAddresses.
// TODO(milestone 8): PIN lookup → auto-fill city/state + serviceability.
export default function AddressFields({
  prefix,
  values,
  onChange,
}: {
  prefix: "shipping_address" | "billing_address"
  values: Values
  onChange: (name: string, value: string) => void
}) {
  const n = (k: string) => `${prefix}.${k}`
  const id = (k: string) => `${prefix}-${k}`
  const bind = (k: string) => ({
    id: id(k),
    name: n(k),
    value: values[n(k)] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(n(k), e.target.value),
  })

  return (
    <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
      <input type="hidden" name={n("country_code")} value="in" />
      <div>
        <label htmlFor={id("first_name")} className={labelCls}>First name</label>
        <input {...bind("first_name")} autoComplete={`${prefix === "billing_address" ? "billing " : ""}given-name`} required className={field} />
      </div>
      <div>
        <label htmlFor={id("last_name")} className={labelCls}>Last name</label>
        <input {...bind("last_name")} autoComplete={`${prefix === "billing_address" ? "billing " : ""}family-name`} className={field} />
      </div>
      <div className="xsmall:col-span-2">
        <label htmlFor={id("address_1")} className={labelCls}>House / flat no., building, street</label>
        <input {...bind("address_1")} autoComplete="address-line1" required className={field} />
      </div>
      <div className="xsmall:col-span-2">
        <label htmlFor={id("address_2")} className={labelCls}>
          Area, landmark <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input {...bind("address_2")} autoComplete="address-line2" className={field} />
      </div>
      <div>
        <label htmlFor={id("postal_code")} className={labelCls}>PIN code</label>
        <input
          {...bind("postal_code")}
          onChange={(e) => onChange(n("postal_code"), e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[1-9][0-9]{5}"
          title="6-digit PIN code"
          maxLength={6}
          required
          className={field}
        />
      </div>
      <div>
        <label htmlFor={id("city")} className={labelCls}>City / town</label>
        <input {...bind("city")} autoComplete="address-level2" required className={field} />
      </div>
      <div className="xsmall:col-span-2">
        <label htmlFor={id("province")} className={labelCls}>State</label>
        <select {...bind("province")} autoComplete="address-level1" required className={field}>
          <option value="">Choose your state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
