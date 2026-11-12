import { FlaskConical } from "lucide-react"
import type { PaymentAdapter } from "./index"
import TestPayButton from "./test-payment-button"

// Staging/development stand-in for a real gateway. The backend provider exists only
// when TEST_PAYMENT_ENABLED=true and SITE_MODE isn't live, so this never shows live.
export const testPayment: PaymentAdapter = {
  match: (id) => id.startsWith("pp_test-payment_"),
  kind: "online",
  title: "Test payment (staging only)",
  description: "Simulates a successful or failed online payment. Not shown on the live site.",
  icon: <FlaskConical className="h-5 w-5 text-accent" aria-hidden />,
  PayButton: TestPayButton,
}
