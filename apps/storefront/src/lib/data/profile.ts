"use server"

import { sdk } from "@lib/config"
import { refresh, revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

export type Consent = { sms?: boolean; whatsapp?: boolean; email?: boolean }
export type ProfileState = { ok: boolean; message: string } | null

export async function getConsent(): Promise<Consent> {
  return sdk.client
    .fetch<{ consent: Consent }>("/store/customers/me/marketing-consent", { headers: await getAuthHeaders(), cache: "no-store" })
    .then((r) => r.consent)
    .catch(() => ({}))
}

// Name, optional email and marketing opt-ins (each channel separately; untick = opt out).
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const first_name = String(form.get("first_name") ?? "").trim().slice(0, 60)
  const last_name = String(form.get("last_name") ?? "").trim().slice(0, 60)
  const email = String(form.get("email") ?? "").trim().toLowerCase()
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Please enter a valid email address, or leave it empty." }
  const headers = await getAuthHeaders()
  try {
    await sdk.store.customer.update({ first_name, last_name, ...(email ? { email } : {}) }, {}, headers)
    await sdk.client.fetch("/store/customers/me/marketing-consent", {
      method: "POST",
      headers,
      body: { sms: form.get("consent_sms") === "on", whatsapp: form.get("consent_whatsapp") === "on", email: form.get("consent_email") === "on" },
    })
  } catch (e) {
    return { ok: false, message: (e as Error).message || "Could not save. Please try again." }
  }
  revalidateTag(await getCacheTag("customers"), { expire: 0 })
  refresh()
  return { ok: true, message: "Saved." }
}
