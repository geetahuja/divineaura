import type { TimelineEvent, TimelineShipment } from "@lib/data/timeline"
import { Check } from "lucide-react"

const STEPS = ["placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"] as const
const LABEL: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rto: "Returned to us",
  cancelled: "Cancelled",
}
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

// Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered (+ RTO / Cancelled).
export default function OrderTimeline({ events, shipment }: { events: TimelineEvent[]; shipment: TimelineShipment }) {
  const at = new Map(events.map((e) => [e.status, e.occurred_at]))
  const end = at.has("cancelled") ? "cancelled" : at.has("rto") ? "rto" : null
  const steps: string[] = end ? [...STEPS.filter((s) => at.has(s)), end] : [...STEPS]

  return (
    <section aria-labelledby="timeline-heading" className="py-6">
      <h2 id="timeline-heading" className="font-serif text-2xl font-semibold text-primary">Order status</h2>
      {shipment && (
        <p className="mt-2 text-sm text-ink-soft">
          {shipment.courier_name} · AWB <span className="font-mono text-ink">{shipment.awb}</span>
          {shipment.tracking_url && (
            <>
              {" · "}
              <a href={shipment.tracking_url} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">Track with courier</a>
            </>
          )}
        </p>
      )}
      <ol className="mt-4 flex flex-col gap-0">
        {steps.map((s, i) => {
          const done = at.has(s)
          const bad = s === "cancelled" || s === "rto"
          return (
            <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <span aria-hidden className={`absolute left-[11px] top-6 h-full w-0.5 ${done && at.has(steps[i + 1]) ? "bg-primary" : "bg-champagne"}`} />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done ? (bad ? "border-red-700 bg-red-700 text-white" : "border-primary bg-primary text-white") : "border-champagne bg-white"
                }`}
                aria-hidden
              >
                {done && <Check className="h-3.5 w-3.5" />}
              </span>
              <div className="-mt-0.5">
                <p className={`text-sm font-semibold ${done ? "text-ink" : "text-ink-muted"}`}>
                  {LABEL[s]}
                  <span className="sr-only">{done ? " (done)" : " (pending)"}</span>
                </p>
                {done && <p className="text-xs text-ink-muted">{when(at.get(s)!)}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
