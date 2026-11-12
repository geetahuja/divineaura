import { retrieveCart } from "@lib/data/cart"
import { simulateTestPayment } from "@lib/data/test-payment"
import { convertToLocale } from "@lib/util/money"
import { siteMode } from "@lib/util/site-mode"
import { FlaskConical } from "lucide-react"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Test payment", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ session?: string }> }

/**
 * STAGING / DEVELOPMENT ONLY: stands in for the gateway's payment page
 * (Razorpay Checkout / Cashfree). Not available when SITE_MODE=live.
 */
export default async function TestPaymentPage(props: Props) {
  if (siteMode() === "live") {
    notFound()
  }
  const sessionId = (await props.searchParams).session ?? ""
  const cart = await retrieveCart()
  const session = cart?.payment_collection?.payment_sessions?.find((s) => s.id === sessionId && s.status === "pending")
  if (!cart || !session) {
    notFound()
  }

  const amount = convertToLocale({ amount: Number(session.amount), currency_code: cart.currency_code })
  const btn = "h-12 w-full rounded-full text-base font-semibold"

  return (
    <div className="content-container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-accent bg-white p-6 text-center">
        <FlaskConical className="mx-auto h-10 w-10 text-accent" aria-hidden />
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent">Development only</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-primary">Test payment</h1>
        <p className="mt-2 text-sm text-ink-soft">
          This page stands in for the payment gateway. No money moves. Choose how this payment should end.
        </p>
        <p className="mt-5 text-3xl font-semibold text-ink">{amount}</p>
        <p className="text-xs text-ink-muted">Order total for {cart.items?.length ?? 0} item(s)</p>

        <div className="mt-6 flex flex-col gap-3">
          <form action={simulateTestPayment.bind(null, session.id, "success")}>
            <button className={`${btn} bg-green-700 text-white hover:bg-green-800`}>Pay successfully</button>
          </form>
          <form action={simulateTestPayment.bind(null, session.id, "failure")}>
            <button className={`${btn} bg-red-700 text-white hover:bg-red-800`}>Fail payment</button>
          </form>
          <form action={simulateTestPayment.bind(null, session.id, "cancel")}>
            <button className={`${btn} border border-champagne text-ink hover:border-primary`}>Cancel and go back</button>
          </form>
        </div>
      </div>
    </div>
  )
}
