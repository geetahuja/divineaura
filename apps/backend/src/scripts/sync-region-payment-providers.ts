import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Offers every configured online payment provider in the India region and
 * removes Medusa's "manual payment" (pp_system_default), which would let
 * anyone place unpaid orders. Run after adding/removing a provider in
 * medusa-config.ts (test payment in dev; Razorpay or Cashfree later):
 *
 *   pnpm medusa exec ./src/scripts/sync-region-payment-providers.ts
 */
export default async function syncRegionPaymentProviders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const providers = (await container.resolve(Modules.PAYMENT).listPaymentProviders({ is_enabled: true }))
    .map((p) => p.id)
    .filter((id) => id !== "pp_system_default")

  // ponytail: single-region store (India); loop over regions if more are added.
  const [region] = await container.resolve(Modules.REGION).listRegions({ currency_code: "inr" })
  if (!region) {
    throw new Error("India (INR) region not found")
  }
  await updateRegionsWorkflow(container).run({
    input: { selector: { id: region.id }, update: { payment_providers: providers } },
  })
  logger.info(
    providers.length
      ? `Region ${region.name}: payment providers set to ${providers.join(", ")}`
      : `Region ${region.name}: no online payment providers configured — checkout cannot take payment`
  )
}
