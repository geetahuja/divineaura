import { FlaskConical } from "lucide-react"
import type { PaymentAdapter } from "./index"
import TestPayButton from "./test-payment-button"

// Development-only stand-in for Razorpay. The backend provider exists only when
// TEST_PAYMENT_ENABLED=true (never in production), so this never shows live.
export const testPayment: PaymentAdapter = {
  match: (id) => id.startsWith("pp_test-payment_"),
  title: "Test payment (development only)",
  description: "Simulates a successful or failed online payment. Not shown on the live site.",
  icon: <FlaskConical className="h-5 w-5 text-accent" aria-hidden />,
  PayButton: TestPayButton,
}
