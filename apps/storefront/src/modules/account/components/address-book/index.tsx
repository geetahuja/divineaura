"use client"

import { removeAddress, saveAddress, setDefaultAddress } from "@lib/data/addresses"
import { HttpTypes } from "@medusajs/types"
import AddressFields, { field, labelCls } from "@modules/checkout/components/address-fields"
import { useRouter } from "next/navigation"
import { useState } from "react"

const KEYS = ["first_name", "last_name", "address_1", "address_2", "postal_code", "city", "province", "phone"] as const
type A = HttpTypes.StoreCustomerAddress

const toValues = (a?: A | null) =>
  Object.fromEntries(KEYS.map((k) => [`shipping_address.${k}`, k === "phone" ? (a?.phone ?? "").replace(/^\+91/, "") : ((a?.[k] as string) ?? "")]))
const fromValues = (v: Record<string, string>) => Object.fromEntries(KEYS.map((k) => [k, v[`shipping_address.${k}`] ?? ""])) as Record<(typeof KEYS)[number], string>

function AddressForm({ address, isFirst, onClose }: { address: A | null; isFirst: boolean; onClose: () => void }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => toValues(address))
  const [makeDefault, setMakeDefault] = useState(isFirst || !!address?.is_default_shipping)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const r = await saveAddress(address?.id ?? null, fromValues(values), makeDefault)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onClose()
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-champagne bg-white p-4" noValidate>
      <p className="font-serif text-xl font-semibold text-primary">{address ? "Edit address" : "New address"}</p>
      <AddressFields prefix="shipping_address" values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
      <div>
        <label htmlFor="addr-phone" className={labelCls}>Mobile number for delivery</label>
        <input
          id="addr-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          className={field}
          value={values["shipping_address.phone"]}
          onChange={(e) => setValues((s) => ({ ...s, "shipping_address.phone": e.target.value }))}
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-5 w-5 accent-[#762019]" />
        Use as my default address at checkout
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="h-11 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {busy ? "Saving…" : "Save address"}
        </button>
        <button type="button" onClick={onClose} className="h-11 rounded-full border border-champagne px-6 font-semibold text-ink">Cancel</button>
      </div>
    </form>
  )
}

// Account → Addresses: add, edit, delete, set default (used at checkout when logged in).
export default function AddressBook({ customer }: { customer: HttpTypes.StoreCustomer; region?: HttpTypes.StoreRegion }) {
  const router = useRouter()
  const [editing, setEditing] = useState<A | "new" | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const addresses = [...(customer.addresses ?? [])].sort((a, b) => Number(!!b.is_default_shipping) - Number(!!a.is_default_shipping))

  const run = async (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(id)
    const r = await fn()
    setBusy(null)
    if (!r.ok) return setError(r.error ?? "Something went wrong.")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {editing === "new" ? (
        <AddressForm address={null} isFirst={!addresses.length} onClose={() => setEditing(null)} />
      ) : (
        <button onClick={() => setEditing("new")} className="h-11 self-start rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover" data-testid="add-address-button">
          + Add address
        </button>
      )}
      {!addresses.length && editing !== "new" && <p className="text-sm text-ink-soft">No saved addresses yet. Addresses you save here are offered at checkout.</p>}
      <ul className="grid gap-4 small:grid-cols-2">
        {addresses.map((a) =>
          editing !== "new" && editing?.id === a.id ? (
            <li key={a.id} className="small:col-span-2">
              <AddressForm address={a} isFirst={false} onClose={() => setEditing(null)} />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col gap-2 rounded-lg border border-champagne bg-white p-4" data-testid="address-container">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink" data-testid="address-name">{[a.first_name, a.last_name].filter(Boolean).join(" ")}</p>
                {a.is_default_shipping && <span className="rounded-full bg-champagne px-2.5 py-0.5 text-xs font-semibold text-primary">Default</span>}
              </div>
              <p className="text-sm text-ink-soft" data-testid="address-address">
                {[a.address_1, a.address_2].filter(Boolean).join(", ")}
                <br />
                {a.city} – {a.postal_code}, {a.province}
                {a.phone && (
                  <>
                    <br />
                    Mobile {a.phone}
                  </>
                )}
              </p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-2 text-sm font-semibold">
                <button onClick={() => setEditing(a)} className="text-primary hover:underline" data-testid="address-edit-button">Edit</button>
                {!a.is_default_shipping && (
                  <button disabled={busy === a.id} onClick={() => run(a.id, () => setDefaultAddress(a.id))} className="text-primary hover:underline">Set as default</button>
                )}
                <button disabled={busy === a.id} onClick={() => run(a.id, () => removeAddress(a.id))} className="text-ink-soft hover:text-red-700" data-testid="address-delete-button">
                  {busy === a.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
