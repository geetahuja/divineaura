// Cookie consent (DPDP Act, ARCHITECTURE.md §14). Essential cookies (cart, login)
// are always on; analytics and marketing only after an explicit choice.
export const CONSENT_COOKIE = "da_consent"
export const CONSENT_VERSION = 1
export type Consent = { analytics: boolean; marketing: boolean }

/** Cookie value → choice, or null when there is no (valid, current-version) choice yet. */
export function parseConsent(raw?: string | null): Consent | null {
  if (!raw) return null
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as { v?: number; a?: unknown; m?: unknown }
    if (v.v !== CONSENT_VERSION) return null
    return { analytics: v.a === true, marketing: v.m === true }
  } catch {
    return null
  }
}

export const serializeConsent = (c: Consent) => encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, a: c.analytics, m: c.marketing, t: new Date().toISOString().slice(0, 10) }))

export function readConsentCookie(): Consent | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  return parseConsent(m?.[1])
}

export function saveConsent(c: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(c)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`
  window.dispatchEvent(new CustomEvent("da:consent", { detail: c }))
}

export const openConsentSettings = () => window.dispatchEvent(new Event("da:open-consent"))
