import { getPublicPaymentSettings } from "@lib/data/payment-options"
import { convertToLocale } from "@lib/util/money"
import { Banknote, BadgeCheck, HeartHandshake, ShieldCheck, Truck } from "lucide-react"

// Option A trust strip (+ COD when switched on in Admin → COD & payments).
export default async function TrustStrip() {
  const payments = await getPublicPaymentSettings()
  const items = [
    { icon: BadgeCheck, title: "100% Authentic", sub: "Products" },
    { icon: ShieldCheck, title: "Secure & Easy", sub: "Payments" },
    { icon: Truck, title: "Fast & Reliable", sub: "Delivery" },
    payments?.cod_enabled && { icon: Banknote, title: "Cash on Delivery", sub: `Up to ${convertToLocale({ amount: payments.cod_max_order_value, currency_code: "inr" })}` },
    { icon: HeartHandshake, title: "Devotion in", sub: "Every Order" },
  ].filter((i): i is { icon: typeof Truck; title: string; sub: string } => !!i)

  return (
    <section aria-label="Why shop with us" className="[contain-intrinsic-size:auto_200px] [content-visibility:auto] border-y border-champagne bg-[#F7E6CC]">
      <ul className="content-container grid grid-cols-2 gap-x-4 gap-y-5 py-6 small:flex small:justify-between small:py-7">
        {items.map(({ icon: Icon, title, sub }, i) => (
          <li key={title} className={`flex items-center gap-3 small:flex-1 small:justify-center ${i ? "small:border-l small:border-accent/40" : ""}`}>
            <Icon aria-hidden className="h-9 w-9 shrink-0 text-accent" strokeWidth={1.4} />
            <p className="font-serif text-base leading-tight text-primary">
              {title}
              <br />
              {sub}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
