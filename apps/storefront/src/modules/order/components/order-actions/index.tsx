"use client"

import { cancelMyOrder, OrderActions as Actions, requestReturn, ReturnPayload } from "@lib/data/order-actions"
import { convertToLocale } from "@lib/util/money"
import { FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

const inr = (n: number) => convertToLocale({ amount: n, currency_code: "inr" })
const field = "h-11 w-full rounded-md border border-champagne bg-white px-3 text-base text-ink focus:border-primary focus:outline-none"
const primary = "h-11 rounded-full bg-primary px-5 font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
const outline = "h-11 rounded-full border border-primary px-5 font-semibold text-primary hover:bg-ivory disabled:opacity-50"

const REASONS: [string, string][] = [
  ["damaged", "Arrived damaged"],
  ["wrong_item", "Wrong item received"],
  ["not_as_described", "Not as described"],
  ["quality", "Quality issue"],
  ["changed_mind", "Changed my mind"],
  ["other", "Other"],
]
const STATUS: Record<string, [string, string]> = {
  requested: ["Requested — we'll review it within 2 working days", "bg-amber-50 text-amber-900"],
  approved: ["Approved — courier pickup booked", "bg-blue-50 text-blue-900"],
  rejected: ["Not accepted", "bg-red-50 text-red-800"],
  received: ["Received — refund in progress", "bg-purple-50 text-purple-900"],
  refunded: ["Refunded", "bg-green-50 text-green-800"],
}

/** Phone photos → JPEG at most 1600 px (~0.3 MB) so uploads are quick on mobile data. */
async function resize(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.8)
}

function ReturnForm({ orderId, data, onDone }: { orderId: string; data: Actions["returns"]; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({})
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank">("upi")
  const [payout, setPayout] = useState({ upi_id: "", account_name: "", account_number: "", ifsc: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const picked = Object.entries(qty).filter(([, q]) => q > 0)
  const estimate = picked.reduce((n, [id, q]) => n + (data.lines.find((l) => l.id === id)?.unit_refund ?? 0) * q, 0)
  const manual = data.refund_method === "manual"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!picked.length) return setError("Choose the item(s) you want to return.")
    if (!reason) return setError("Choose a reason.")
    setBusy(true)
    setError(null)
    const body: ReturnPayload = {
      items: picked.map(([item_id, quantity]) => ({ item_id, quantity })),
      reason,
      details: details.trim() || undefined,
      photos,
      payout: manual
        ? payoutMethod === "upi"
          ? { method: "upi", upi_id: payout.upi_id.trim() }
          : { method: "bank", account_name: payout.account_name.trim(), account_number: payout.account_number.replace(/\s/g, ""), ifsc: payout.ifsc.trim().toUpperCase() }
        : null,
    }
    const r = await requestReturn(orderId, body)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 rounded-lg border border-champagne bg-white p-4" noValidate>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-semibold text-ink">Which items?</legend>
        {data.lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm ${l.returnable ? "text-ink" : "text-ink-muted"}`}>{l.title}</p>
              <p className="text-xs text-ink-muted">
                {!l.returnable ? "Not returnable" : l.available === 0 ? "Already returned" : `Refund ${inr(l.unit_refund)} each`}
              </p>
            </div>
            {l.returnable && l.available > 0 && (
              <select
                aria-label={`Quantity to return of ${l.title}`}
                className="h-10 rounded-md border border-champagne bg-white px-2 text-base"
                value={qty[l.id] ?? 0}
                onChange={(e) => setQty({ ...qty, [l.id]: Number(e.target.value) })}
              >
                {Array.from({ length: l.available + 1 }, (_, n) => (
                  <option key={n} value={n}>{n === 0 ? "None" : n}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </fieldset>
      <div>
        <label htmlFor="ret-reason" className="mb-1 block text-sm font-semibold text-ink">Reason</label>
        <select id="ret-reason" className={field} value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Choose a reason</option>
          {REASONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ret-details" className="mb-1 block text-sm font-semibold text-ink">Details (optional)</label>
        <textarea id="ret-details" rows={3} maxLength={1000} className={`${field} h-auto py-2`} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ret-photos" className="mb-1 block text-sm font-semibold text-ink">Photos (optional, up to 3)</label>
        <input
          id="ret-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-champagne file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
          onChange={async (e) => setPhotos(await Promise.all(Array.from(e.target.files ?? []).slice(0, 3).map(resize)))}
        />
        {!!photos.length && (
          <div className="mt-2 flex gap-2">
            {photos.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded-md object-cover" />
            ))}
          </div>
        )}
      </div>

      {manual && (
        <fieldset className="grid gap-3 rounded-md bg-ivory p-3">
          <legend className="text-sm font-semibold text-ink">Where should we send your refund?</legend>
          <p className="text-xs text-ink-soft">This was a Cash on Delivery order, so we refund to your UPI ID or bank account. Your details are stored encrypted and deleted after the refund.</p>
          <div className="flex gap-4 text-sm">
            {(["upi", "bank"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="payout" checked={payoutMethod === m} onChange={() => setPayoutMethod(m)} className="accent-[#762019]" />
                {m === "upi" ? "UPI ID" : "Bank account"}
              </label>
            ))}
          </div>
          {payoutMethod === "upi" ? (
            <input aria-label="UPI ID" placeholder="name@okicici" autoComplete="off" className={field} value={payout.upi_id} onChange={(e) => setPayout({ ...payout, upi_id: e.target.value })} />
          ) : (
            <>
              <input aria-label="Account holder name" placeholder="Account holder name" autoComplete="off" className={field} value={payout.account_name} onChange={(e) => setPayout({ ...payout, account_name: e.target.value })} />
              <input aria-label="Account number" placeholder="Account number" inputMode="numeric" autoComplete="off" className={field} value={payout.account_number} onChange={(e) => setPayout({ ...payout, account_number: e.target.value })} />
              <input aria-label="IFSC code" placeholder="IFSC, e.g. HDFC0001234" autoComplete="off" className={`${field} uppercase`} value={payout.ifsc} onChange={(e) => setPayout({ ...payout, ifsc: e.target.value })} />
            </>
          )}
        </fieldset>
      )}

      {picked.length > 0 && (
        <p className="text-sm text-ink">
          Estimated refund: <span className="font-semibold">{inr(estimate)}</span>
          <span className="block text-xs text-ink-muted">Shipping and the Cash on Delivery fee are not refunded on returns.</span>
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className={primary} disabled={busy}>{busy ? "Sending…" : "Request return"}</button>
    </form>
  )
}

// Account → order: invoice, cancel, returns (ARCHITECTURE.md §6, §10).
export default function OrderActions({ orderId, actions }: { orderId: string; actions: Actions | null }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [returning, setReturning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  if (!actions) return null
  const r = actions.returns
  const canReturn = r.open && r.lines.some((l) => l.returnable && l.available > 0)

  async function cancel() {
    setBusy(true)
    setError(null)
    const res = await cancelMyOrder(orderId)
    setBusy(false)
    setConfirming(false)
    if (!res.ok) return setError(res.error)
    setNotice(actions!.payment_method === "online" ? "Your order is cancelled. The refund is on its way to your original payment method." : "Your order is cancelled.")
    router.refresh()
  }

  return (
    <section aria-labelledby="order-actions-heading" className="flex flex-col gap-4 border-t border-champagne py-6">
      <h2 id="order-actions-heading" className="sr-only">Invoice, cancellation and returns</h2>
      <p className="text-sm text-ink-soft">
        Payment method: <span className="font-semibold text-ink">{actions.payment_method === "cod" ? "Cash on Delivery" : "Paid online"}</span>
      </p>

      <div className="flex flex-wrap gap-3">
        {actions.invoice ? (
          <a href={actions.invoice.url} target="_blank" rel="noopener" className={`${outline} inline-flex items-center gap-2`} data-testid="invoice-link">
            <FileText className="h-4 w-4" aria-hidden /> Invoice {actions.invoice.number}
          </a>
        ) : (
          <p className="text-sm text-ink-muted">Your GST invoice will be available once the order is {actions.payment_method === "cod" ? "confirmed" : "paid"}.</p>
        )}
        {actions.credit_notes.map((n) => (
          <a key={n.number} href={n.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <FileText className="h-4 w-4" aria-hidden /> Credit note {n.number} ({inr(n.amount)})
          </a>
        ))}
      </div>

      {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {actions.cancel.allowed &&
        (confirming ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-ink">
              Cancel this order?{" "}
              {actions.payment_method === "online" ? "The full amount will be refunded to your original payment method." : "Nothing has been charged for this Cash on Delivery order."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="h-11 rounded-full bg-red-700 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={cancel}>
                {busy ? "Cancelling…" : "Yes, cancel order"}
              </button>
              <button className={outline} onClick={() => setConfirming(false)} disabled={busy}>Keep order</button>
            </div>
          </div>
        ) : (
          <button className={`${outline} self-start`} onClick={() => setConfirming(true)} data-testid="cancel-order">Cancel order</button>
        ))}

      {!!r.requests.length && (
        <div className="grid gap-2">
          <h3 className="font-serif text-xl font-semibold text-primary">Returns</h3>
          {r.requests.map((q) => (
            <div key={q.id} className="rounded-lg border border-champagne bg-white p-3 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[q.status][1]}`}>{STATUS[q.status][0]}</span>
              <p className="mt-2 text-ink">{q.items.map((i) => `${i.quantity} × ${i.title ?? "item"}`).join(", ")}</p>
              <p className={`text-ink-soft ${q.status === "rejected" ? "hidden" : ""}`}>
                Refund {inr(q.refund_amount)} {q.refund_method === "original" ? "to your original payment method" : q.payout_hint ? `to ${q.payout_hint}` : ""}
              </p>
              {q.pickup_awb && <p className="text-ink-soft">Pickup AWB {q.pickup_awb}</p>}
              {q.admin_note && <p className="text-ink-soft">Reason: {q.admin_note}</p>}
            </div>
          ))}
        </div>
      )}

      {canReturn ? (
        returning ? (
          <ReturnForm
            orderId={orderId}
            data={r}
            onDone={() => {
              setReturning(false)
              setNotice("Return requested. We'll review it within 2 working days and message you.")
              router.refresh()
            }}
          />
        ) : (
          <div>
            <button className={primary} onClick={() => setReturning(true)} data-testid="request-return">Request a return</button>
            {r.closes_at && <p className="mt-1 text-xs text-ink-muted">Returns open until {new Date(r.closes_at).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.</p>}
          </div>
        )
      ) : (
        r.reason && !actions.cancel.allowed && <p className="text-sm text-ink-muted">{r.reason}</p>
      )}
    </section>
  )
}
