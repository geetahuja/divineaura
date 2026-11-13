"use server"

import { sdk } from "@lib/config"

// Content pages are edited in Admin → Pages; cached for a minute like the catalogue.
const cached = { next: { revalidate: 60 }, cache: "force-cache" as const }

export type ContentPage = {
  slug: string
  title: string
  html: string // safe HTML rendered by the backend (all admin input escaped)
  faq: { q: string; a_html: string; a_text: string }[]
  seo_title: string | null
  seo_description: string | null
  updated_at: string
  draft_note: boolean
}

export async function getPage(slug: string): Promise<ContentPage | null> {
  return sdk.client
    .fetch<{ page: ContentPage }>(`/store/pages/${slug}`, cached)
    .then((r) => r.page)
    .catch(() => null)
}

export type Seller = {
  legal_name: string
  brand: string
  brand_hi: string
  tagline_en: string
  tagline_hi: string
  social: { instagram: string | null; facebook: string | null; youtube: string | null; pinterest: string | null }
  kumbh: { snan_label: string | null; snan_date: string | null; dispatch_date: string | null; packer: string | null }
  address: string | null
  gstin: string | null
  email: string | null
  phone: string | null
  grievance: { name: string | null; email: string | null; phone: string | null; ack_hours: number; resolve_days: number }
}

export async function getSeller(): Promise<Seller | null> {
  return sdk.client
    .fetch<{ seller: Seller }>("/store/seller", cached)
    .then((r) => r.seller)
    .catch(() => null)
}

// Brand name/taglines live in Admin → Business details; this fallback only covers an unreachable API.
export async function getBrand() {
  const s = await getSeller()
  return {
    name: s?.brand || "Anant Sanatan",
    name_hi: s?.brand_hi || "अनंत सनातन",
    tagline_en: s?.tagline_en ?? "Beyond Eternity, Beyond Time.",
    tagline_hi: s?.tagline_hi ?? "समय से पहले, समय के बाद भी।",
  }
}

export async function getBrandName() {
  return (await getBrand()).name
}

export type FormState = { ok: boolean; message: string } | null

const errorText = (e: unknown) => {
  const m = (e as Error)?.message ?? ""
  return m && !/^\d{3}$/.test(m) ? m.replace(/^Invalid request: /, "") : "Something went wrong. Please try again."
}

export async function sendContact(_prev: FormState, form: FormData): Promise<FormState> {
  const v = (k: string) => String(form.get(k) ?? "").trim()
  try {
    await sdk.client.fetch("/store/contact", {
      method: "POST",
      body: { name: v("name"), email: v("email"), phone: v("phone"), order_number: v("order_number"), topic: v("topic") || "other", message: v("message"), website: v("website") },
    })
    return { ok: true, message: "Thank you — your message has been sent. We'll reply within one working day." }
  } catch (e) {
    return { ok: false, message: errorText(e) }
  }
}

export async function sendPrivacyRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const v = (k: string) => String(form.get(k) ?? "").trim()
  try {
    await sdk.client.fetch("/store/privacy-requests", {
      method: "POST",
      body: { kind: v("kind") || "delete_data", name: v("name"), email: v("email"), phone: v("phone"), details: v("details"), website: v("website") },
    })
    return { ok: true, message: "Request received. We'll verify it's you and reply within the time stated on our Grievance page." }
  } catch (e) {
    return { ok: false, message: errorText(e) }
  }
}
