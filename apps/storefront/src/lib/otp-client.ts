// Browser → backend OTP calls (the real client IP reaches the rate limiter).
const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export type OtpTarget = { phone: string } | { email: string }
export type OtpError = { reason?: string; message?: string; attempts_left?: number; retry_after_seconds?: number }

async function post<T>(path: string, body: object): Promise<{ ok: true; data: T } | { ok: false; error: OtpError }> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({}))
    return r.ok ? { ok: true, data: data as T } : { ok: false, error: data as OtpError }
  } catch {
    return { ok: false, error: { message: "Network problem. Please check your connection and try again." } }
  }
}

export const requestCode = (target: OtpTarget, resend = false) =>
  post<{ channel: string; resend_after_seconds: number }>("/store/otp/request", { ...target, resend })
export const verifyCode = (target: OtpTarget, code: string) => post<{ ticket: string }>("/store/otp/verify", { ...target, code })
