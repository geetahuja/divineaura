"use client"

import { CodConfirmState, confirmCodOrder } from "@lib/data/cod-confirm"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { useActionState } from "react"

const COPY: Record<CodConfirmState["state"], { title: string; text: string }> = {
  pending: { title: "Confirm your Cash on Delivery order", text: "Please confirm so we can pack and ship it. You'll pay in cash when it arrives." },
  confirmed: { title: "Your order is confirmed", text: "Thank you! We'll pack it with care and send tracking details soon. Please keep the cash ready on delivery." },
  cancelled: { title: "This order was cancelled", text: "It was not confirmed in time or was cancelled by us. You're welcome to place it again." },
  expired: { title: "This link has expired", text: "Unconfirmed Cash on Delivery orders are cancelled automatically. You're welcome to order again." },
  invalid: { title: "This link isn't valid", text: "Please use the latest link we sent you, or contact us if you need help." },
}

export default function ConfirmCod({ token, initial }: { token: string; initial: CodConfirmState }) {
  const [result, action, pending] = useActionState(confirmCodOrder.bind(null, token), null)
  const s = result ?? initial
  const copy = COPY[s.state]
  const Icon = s.state === "confirmed" ? CheckCircle2 : s.state === "pending" ? Clock : XCircle

  return (
    <div className="w-full max-w-md rounded-2xl border border-champagne bg-white p-6 text-center">
      <Icon className={`mx-auto h-12 w-12 ${s.state === "confirmed" ? "text-green-700" : s.state === "pending" ? "text-accent" : "text-ink-muted"}`} aria-hidden />
      <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">{copy.title}</h1>
      {s.order && <p className="mt-1 text-sm font-semibold text-ink">Order #{s.order.display_id}</p>}
      <p className="mt-3 text-ink-soft">{copy.text}</p>

      {s.order && (s.state === "pending" || s.state === "confirmed") && (
        <div className="mt-5 rounded-lg bg-ivory-deep p-4 text-left text-sm">
          <ul className="space-y-1 text-ink">
            {s.order.items.map((i, n) => (
              <li key={n}>{i.quantity} × {i.title}</li>
            ))}
          </ul>
          <p className="mt-2 border-t border-champagne pt-2 font-semibold text-ink">
            Pay on delivery: {convertToLocale({ amount: Number(s.order.total), currency_code: s.order.currency_code })}
          </p>
        </div>
      )}

      {s.state === "pending" && (
        <form action={action} className="mt-6">
          <button disabled={pending} className="h-12 w-full rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            {pending ? "Confirming…" : "Confirm my order"}
          </button>
        </form>
      )}
      {s.state !== "pending" && (
        <LocalizedClientLink href="/shop" className="mt-6 inline-flex h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary">
          Continue shopping
        </LocalizedClientLink>
      )}
    </div>
  )
}
