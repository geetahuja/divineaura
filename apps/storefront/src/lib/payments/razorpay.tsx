import { ShieldCheck } from "lucide-react"
import type { PaymentAdapter } from "./index"
import RazorpayPayButton from "./razorpay-button"

// Backend provider pp_razorpay_razorpay (registered when RAZORPAY_* keys are set).
export const razorpay: PaymentAdapter = {
  match: (id) => id.startsWith("pp_razorpay_"),
  kind: "online",
  title: "UPI, cards, net banking (Razorpay)",
  description: "Pay securely with any UPI app, debit/credit card, net banking or wallet.",
  icon: <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />,
  PayButton: RazorpayPayButton,
}
