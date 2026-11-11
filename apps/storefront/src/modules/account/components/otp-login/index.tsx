"use client"

import { loginWithTicket } from "@lib/data/otp-login"
import { OtpTarget, requestCode, verifyCode } from "@lib/otp-client"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useRef, useState } from "react"

const field = "h-12 w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const button = "h-12 w-full rounded-full bg-primary font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
const link = "text-sm font-semibold text-primary underline-offset-2 hover:underline disabled:text-ink-soft disabled:no-underline"
const VIA: Record<string, string> = { sms: "by SMS", whatsapp: "on WhatsApp", email: "by email" }

/**
 * Mobile OTP login (ARCHITECTURE.md §11): mobile → 6-digit code. New numbers get
 * an account automatically; past guest orders with that number are linked.
 * Email code as a fallback. Android Chrome fills the code via the Web OTP API.
 */
export default function OtpLogin({ next }: { next?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<"phone" | "email">("phone")
  const [value, setValue] = useState("")
  const [target, setTarget] = useState<OtpTarget | null>(null)
  const [via, setVia] = useState("")
  const [code, setCode] = useState("")
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  // Resend countdown
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  // Web OTP: Android Chrome reads "@domain #123456" from the SMS and offers to fill it.
  useEffect(() => {
    if (!target || !("phone" in target) || !("OTPCredential" in window)) return
    const ac = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
      .then((c) => {
        const otp = (c as unknown as { code?: string } | null)?.code
        if (otp) onCode(otp)
      })
      .catch(() => {})
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  async function send(t: OtpTarget, resend: boolean) {
    setBusy(true)
    setError(null)
    const r = await requestCode(t, resend)
    setBusy(false)
    if (!r.ok) {
      setError(r.error.message ?? "Couldn't send the code. Please try again.")
      if (r.error.retry_after_seconds) setWait(r.error.retry_after_seconds)
      return
    }
    setTarget(t)
    setVia(VIA[r.data.channel] ?? "")
    setCode("")
    setWait(r.data.resend_after_seconds)
    setTimeout(() => codeRef.current?.focus(), 50)
  }

  function start(e: FormEvent) {
    e.preventDefault()
    if (mode === "phone") {
      const digits = value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "")
      if (!/^[6-9]\d{9}$/.test(digits)) return setError("Enter a valid 10-digit mobile number.")
      return send({ phone: digits }, false)
    }
    if (!/^\S+@\S+\.\S+$/.test(value.trim())) return setError("Enter a valid email address.")
    send({ email: value.trim() }, false)
  }

  async function submitCode(c: string) {
    if (!target || busy) return
    setBusy(true)
    setError(null)
    const r = await verifyCode(target, c)
    if (!r.ok) {
      setBusy(false)
      setCode("")
      const left = r.error.attempts_left
      return setError(`${r.error.message ?? "That code didn't work."}${left !== undefined && left > 0 ? ` ${left} attempt${left === 1 ? "" : "s"} left.` : ""}`)
    }
    const done = await loginWithTicket(r.data.ticket)
    if (!done.ok) {
      setBusy(false)
      return setError(done.error)
    }
    router.replace(next ?? "/account")
    router.refresh()
  }

  // Typing, pasting "123 456" / "Code: 123456", or Web OTP all end here.
  function onCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6)
    setCode(digits)
    if (digits.length === 6) submitCode(digits)
  }

  const shown = target ? ("phone" in target ? `+91 ${target.phone.slice(0, 5)} ${target.phone.slice(5)}` : target.email) : ""

  return (
    <div className="w-full max-w-sm" data-testid="otp-login">
      <h1 className="font-serif text-3xl font-semibold text-primary">Sign in</h1>

      {!target ? (
        <form onSubmit={start} className="mt-6 grid gap-4" noValidate>
          <p className="text-ink-soft">
            {mode === "phone"
              ? "Enter your mobile number. We'll send you a 6-digit code — no password needed."
              : "Enter your email address and we'll send you a 6-digit code."}
          </p>
          <div>
            <label htmlFor="otp-target" className="mb-1 block text-sm font-semibold text-ink">
              {mode === "phone" ? "Mobile number" : "Email"}
            </label>
            {mode === "phone" ? (
              <div className="flex">
                <span className="flex h-12 items-center rounded-l-md border border-r-0 border-champagne bg-ivory px-3 text-ink">+91</span>
                <input id="otp-target" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} value={value} onChange={(e) => setValue(e.target.value)} className={`${field} rounded-l-none`} required autoFocus />
              </div>
            ) : (
              <input id="otp-target" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} className={field} required autoFocus />
            )}
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className={button} disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
          <button
            type="button"
            className={link}
            onClick={() => {
              setMode(mode === "phone" ? "email" : "phone")
              setValue("")
              setError(null)
            }}
          >
            {mode === "phone" ? "Use email instead" : "Use mobile number instead"}
          </button>
          <p className="text-xs text-ink-soft">New here? An account is created automatically, and your earlier orders with this number appear in it.</p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length === 6) submitCode(code)
          }}
          className="mt-6 grid gap-4"
        >
          <p className="text-ink-soft">
            Enter the 6-digit code sent {via} to <span className="font-semibold text-ink">{shown}</span>.{" "}
            <button type="button" className={link} onClick={() => { setTarget(null); setError(null) }}>
              Change
            </button>
          </p>
          <div>
            <label htmlFor="otp-code" className="mb-1 block text-sm font-semibold text-ink">Login code</label>
            <input
              id="otp-code"
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              value={code}
              onChange={(e) => onCode(e.target.value)}
              className={`${field} text-center text-2xl tracking-[0.5em]`}
              aria-describedby="otp-help"
            />
            <p id="otp-help" className="mt-1 text-xs text-ink-soft">The code is valid for 5 minutes.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className={button} disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify and sign in"}</button>
          <p className="text-center text-sm text-ink-soft">
            {wait > 0 ? (
              <>Resend code in 0:{String(wait).padStart(2, "0")}</>
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button type="button" className={link} disabled={busy} onClick={() => send(target, true)}>
                  Resend code
                </button>
              </>
            )}
          </p>
        </form>
      )}
    </div>
  )
}
