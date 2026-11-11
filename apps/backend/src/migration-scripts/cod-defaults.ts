import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { COD_PROVIDER_ID } from "../lib/cod"
import { syncPrepaidPromotion } from "../lib/payment-choice"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"

// Milestone 7 defaults (run once by `medusa db:migrate`): settings row (COD on,
// ₹49 fee, ₹3,000 max, 5% prepaid, 24 h), the prepaid promotion, and COD
// offered in the India region alongside the existing online providers.
export default async function codDefaults({ container }: ExecArgs) {
  const settings = await container.resolve<CodModuleService>(COD_MODULE).getSettings()
  await syncPrepaidPromotion(container, settings.prepaid_discount_percent)

  // Region ↔ payment provider is a module link, so read it through Query (the
  // region module alone doesn't return it and would make us drop providers).
  const {
    data: [region],
  } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "region",
    fields: ["id", "payment_providers.id"],
    filters: { currency_code: "inr" },
  })
  if (region) {
    const current = (region.payment_providers ?? []).map((p) => p!.id)
    if (!current.includes(COD_PROVIDER_ID)) {
      await updateRegionsWorkflow(container).run({
        input: { selector: { id: region.id }, update: { payment_providers: [...current, COD_PROVIDER_ID] } },
      })
    }
  }
}
