"use server"

import { sdk } from "@lib/config"
import { AddressInput, validateIndianAddress } from "@lib/util/india-address"
import { refresh, revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

type Result = { ok: true } | { ok: false; error: string }
const done = async (): Promise<Result> => {
  revalidateTag(await getCacheTag("customers"), { expire: 0 })
  refresh()
  return { ok: true }
}
const fail = (e: unknown): Result => ({ ok: false, error: (e as Error)?.message || "Could not save. Please try again." })

// Saved addresses (Account → Addresses). The default one is pre-selected at checkout.
export async function saveAddress(id: string | null, input: AddressInput, makeDefault: boolean): Promise<Result> {
  const v = validateIndianAddress(input)
  if (!v.ok) return v
  const body = { ...v.address, ...(makeDefault ? { is_default_shipping: true, is_default_billing: true } : {}) }
  try {
    const headers = await getAuthHeaders()
    if (id) await sdk.store.customer.updateAddress(id, body, {}, headers)
    else await sdk.store.customer.createAddress(body, {}, headers)
    return done()
  } catch (e) {
    return fail(e)
  }
}

export async function setDefaultAddress(id: string): Promise<Result> {
  try {
    await sdk.store.customer.updateAddress(id, { is_default_shipping: true, is_default_billing: true }, {}, await getAuthHeaders())
    return done()
  } catch (e) {
    return fail(e)
  }
}

export async function removeAddress(id: string): Promise<Result> {
  try {
    await sdk.store.customer.deleteAddress(id, await getAuthHeaders())
    return done()
  } catch (e) {
    return fail(e)
  }
}
