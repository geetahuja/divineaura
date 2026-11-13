import { randomUUID } from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { signTestPayment, TEST_PAYMENT_SIGNATURE_HEADER } from "../../../../modules/test-payment/service"
import type { SimulateTestPaymentBody } from "../../../validators"
import { testToolsAllowed } from "../../../../lib/site-mode"
import { recordTestPaymentOutcomeWorkflow } from "../../../../workflows/test-payment"

const PROVIDER_ID = "pp_test-payment_test-payment"
const enabled = () => process.env.TEST_PAYMENT_ENABLED === "true" && testToolsAllowed()

/**
 * DEVELOPMENT ONLY. Plays the payment gateway for the storefront's simulator
 * page: records the outcome on the payment session, then sends Medusa a signed
 * webhook exactly like Razorpay would. The order becomes Paid only when that
 * webhook is verified and processed.
 */
export async function POST(req: MedusaRequest<SimulateTestPaymentBody>, res: MedusaResponse) {
  if (!enabled()) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Not found")
  }
  const { payment_session_id, outcome } = req.validatedBody
  const payments = req.scope.resolve(Modules.PAYMENT)
  const session = await payments.retrievePaymentSession(payment_session_id)

  if (session.provider_id !== PROVIDER_ID) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Not a test payment session")
  }
  if (session.status !== "pending") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Payment session is already ${session.status}`)
  }

  await recordTestPaymentOutcomeWorkflow(req.scope).run({
    input: { session, gateway_status: outcome === "success" ? "paid" : "failed" },
  })

  const body = JSON.stringify({
    event_id: `evt_${randomUUID()}`,
    event: outcome === "success" ? "payment.captured" : "payment.failed",
    session_id: session.id,
    amount: Number(session.amount),
  })
  const base = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
  const hook = await fetch(`${base}/hooks/payment/test-payment_test-payment`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [TEST_PAYMENT_SIGNATURE_HEADER]: signTestPayment(process.env.TEST_PAYMENT_WEBHOOK_SECRET!, body),
    },
    body,
  })
  if (!hook.ok) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Webhook rejected: ${hook.status}`)
  }

  res.json({ outcome })
}
