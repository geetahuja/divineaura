"use server"

import { sdk } from "@lib/config"

export type NewsletterState = { ok: boolean; message: string } | null

// Footer signup: stored only with the consent box ticked (checked again on the server).
export async function subscribeNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const email = String(form.get("email") ?? "").trim()
  if (form.get("consent") !== "on") return { ok: false, message: "Please tick the box to agree to receive our emails." }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Please enter a valid email address." }
  return sdk.client
    .fetch("/store/newsletter", { method: "POST", body: { email, consent: true } })
    .then(() => ({ ok: true, message: "Thank you! You're subscribed." }))
    .catch(() => ({ ok: false, message: "Something went wrong. Please try again." }))
}
