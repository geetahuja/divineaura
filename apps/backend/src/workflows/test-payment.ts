import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { PaymentSessionDTO } from "@medusajs/framework/types"

type Input = { session: PaymentSessionDTO; gateway_status: "paid" | "failed" }
const update = (s: PaymentSessionDTO, data: Record<string, unknown>) => ({ id: s.id, amount: s.amount, currency_code: s.currency_code, data })

// DEVELOPMENT ONLY (test gateway): records the simulated gateway outcome on the payment session.
const recordStep = createStep(
  "record-test-payment-outcome",
  async ({ session, gateway_status }: Input, { container }) => {
    await container.resolve(Modules.PAYMENT).updatePaymentSession(update(session, { ...session.data, gateway_status }))
    return new StepResponse(gateway_status, session)
  },
  async (session, { container }) => {
    if (session) await container.resolve(Modules.PAYMENT).updatePaymentSession(update(session, session.data ?? {}))
  }
)

export const recordTestPaymentOutcomeWorkflow = createWorkflow(
  "record-test-payment-outcome",
  (input: Input) => new WorkflowResponse(recordStep(input))
)
