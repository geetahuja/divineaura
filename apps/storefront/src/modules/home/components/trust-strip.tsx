import { getPublicPaymentSettings } from "@lib/data/payment-options"
import { getStorePolicies } from "@lib/data/store-policies"
import { convertToLocale } from "@lib/util/money"
import { DEFAULT_COUNTRY_CODE } from "@lib/util/site"
import { Banknote, LockKeyhole, RotateCcw, Truck } from "lucide-react"

export default async function TrustStrip() {
  const [{ current }, payments] = await Promise.all([getStorePolicies(DEFAULT_COUNTRY_CODE), getPublicPaymentSettings()])
  const items = [
    // Switched on/off in Admin → COD & payments.
    payments?.cod_enabled && {
      icon: Banknote,
      title: "Cash on delivery",
      sub: `On orders up to ${convertToLocale({ amount: payments.cod_max_order_value, currency_code: "inr" })}`,
    },
    current?.freeShippingThreshold != null && {
      icon: Truck,
      title: `Free shipping above ${convertToLocale({ amount: current.freeShippingThreshold, currency_code: "inr" })}`,
      sub: "Delivered across India",
    },
    current && { icon: RotateCcw, title: "Easy returns", sub: `Within ${current.returnWindowDays} days of delivery` },
    { icon: LockKeyhole, title: "Secure payments", sub: "UPI, cards and net banking" },
  ].filter((i): i is { icon: typeof Truck; title: string; sub: string } => !!i)

  return (
    <section aria-label="Why shop with us" className="border-y border-champagne bg-ivory-deep">
      <ul className="content-container grid grid-cols-2 gap-6 py-8 small:flex small:justify-around">
        {items.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex flex-col items-center gap-2 text-center small:flex-row small:text-left">
            <Icon aria-hidden className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-xs text-ink-muted">{sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
