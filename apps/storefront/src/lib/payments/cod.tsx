import { Banknote } from "lucide-react"
import CodPayButton from "./cod-button"
import type { PaymentAdapter } from "./index"

// Cash on Delivery: no gateway. The order is placed as "Pending confirmation"
// and the customer confirms with the link we send them (ARCHITECTURE.md §9).
export const cod: PaymentAdapter = {
  match: (id) => id.startsWith("pp_cod_"),
  kind: "cod",
  title: "Cash on Delivery",
  description: "Pay in cash when your order arrives. You'll confirm the order with a link we send to your mobile.",
  icon: <Banknote className="h-5 w-5 text-accent" aria-hidden />,
  PayButton: CodPayButton,
}
