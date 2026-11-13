import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"
import { INVOICE_MODULE } from "../modules/invoice"
import { REVIEWS_MODULE } from "../modules/reviews"

type Data = Record<string, unknown>
type SettingsService = { getSettings(): Promise<Data & { id: string }> } & Record<string, (data: Data) => Promise<Data>>

/** Single-row settings (each module's getSettings() creates the row if missing); the previous values are restored if a later step fails. */
function settingsWorkflow(name: string, moduleKey: string, update: string) {
  const step = createStep(
    name,
    async (data: Data, { container }) => {
      const svc = container.resolve<SettingsService>(moduleKey)
      const previous = await svc.getSettings()
      return new StepResponse(await svc[update]({ ...data, id: previous.id }), previous)
    },
    async (previous, { container }) => {
      if (!previous) return
      const { created_at, updated_at, deleted_at, ...rest } = previous
      void created_at, void updated_at, void deleted_at
      await container.resolve<SettingsService>(moduleKey)[update](rest)
    }
  )
  return createWorkflow(name, (input: Data) => new WorkflowResponse(step(input)))
}

export const updateReviewSettingsWorkflow = settingsWorkflow("update-review-settings", REVIEWS_MODULE, "updateReviewSettings")
export const updatePaymentSettingsWorkflow = settingsWorkflow("update-payment-settings", COD_MODULE, "updatePaymentSettings")
export const updateBusinessSettingsWorkflow = settingsWorkflow("update-business-settings", INVOICE_MODULE, "updateBusinessSettings")

const cod = (c: { resolve: <T>(k: string) => T }) => c.resolve<CodModuleService>(COD_MODULE)

const addBlockedStep = createStep(
  "add-cod-blocked-pincodes",
  async (pincodes: string[], { container }) => {
    const rows = await cod(container).createCodBlockedPincodes(pincodes.map((pincode) => ({ pincode })))
    return new StepResponse(rows.length, rows.map((r) => r.id))
  },
  async (ids, { container }) => {
    if (ids?.length) await cod(container).deleteCodBlockedPincodes(ids)
  }
)

const removeBlockedStep = createStep(
  "remove-cod-blocked-pincode",
  async (pincode: string, { container }) => {
    const rows = await cod(container).listCodBlockedPincodes({ pincode }, { select: ["id"] })
    if (rows.length) await cod(container).deleteCodBlockedPincodes(rows.map((r) => r.id))
    return new StepResponse(rows.length, rows.length ? pincode : undefined)
  },
  async (pincode, { container }) => {
    if (pincode) await cod(container).createCodBlockedPincodes({ pincode })
  }
)

export const addCodBlockedPincodesWorkflow = createWorkflow(
  "add-cod-blocked-pincodes",
  (pincodes: string[]) => new WorkflowResponse(addBlockedStep(pincodes))
)
export const removeCodBlockedPincodeWorkflow = createWorkflow(
  "remove-cod-blocked-pincode",
  (pincode: string) => new WorkflowResponse(removeBlockedStep(pincode))
)
