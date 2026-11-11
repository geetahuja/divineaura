import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadCartForPayment } from "../../../../../lib/payment-choice"

// What the payment step may offer for this cart, computed on the server:
// COD availability (+ reason), COD fee, and the prepaid saving in rupees.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await loadCartForPayment(req.scope, req.params.id)
  res.json({
    cod: {
      available: ctx.eligibility.eligible,
      reason: ctx.eligibility.eligible ? null : ctx.eligibility.reason,
      fee: ctx.settings.cod_fee,
      max_order_value: ctx.settings.cod_max_order_value,
    },
    prepaid: { percent: ctx.settings.prepaid_discount_percent, saving: ctx.saving },
    selected: ctx.feeItems.length ? "cod" : ctx.prepaidApplied ? "online" : null,
  })
}
