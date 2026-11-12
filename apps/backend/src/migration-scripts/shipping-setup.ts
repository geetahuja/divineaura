import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  deleteShippingOptionsWorkflow,
  updateTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

const COURIER_PROVIDER = "courier_courier"

/**
 * Milestone 8 setup (runs once with `medusa db:migrate`):
 *  1. link the courier fulfillment provider to the stock location;
 *  2. replace flat-rate shipping options with one calculated "Standard Shipping"
 *     (free-shipping rule now ignores the COD fee and prepaid discount);
 *  3. use the GST tax provider for the India tax region (COD fee GST setting).
 */
export default async function shippingSetup({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"] })
  for (const l of locations) {
    await link
      .create({ [Modules.STOCK_LOCATION]: { stock_location_id: l.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: COURIER_PROVIDER } })
      .catch(() => undefined) // already linked
  }

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "provider_id", "service_zone_id", "shipping_profile_id", "rules.attribute", "rules.operator", "rules.value"],
  })
  const old = options.filter((o) => o.provider_id !== COURIER_PROVIDER)
  if (old.length && !options.some((o) => o.provider_id === COURIER_PROVIDER)) {
    const template = old[0]
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "calculated",
          provider_id: COURIER_PROVIDER,
          service_zone_id: template.service_zone_id,
          shipping_profile_id: template.shipping_profile_id,
          type: { label: "Standard", description: "Delivered across India", code: "standard" },
          data: { id: "standard" },
          rules: (template.rules ?? []).map((r) => ({ attribute: r!.attribute, operator: r!.operator as "eq", value: r!.value as unknown as string })),
        },
      ],
    })
    await deleteShippingOptionsWorkflow(container).run({ input: { ids: old.map((o) => o.id) } })
    logger.info(`Shipping: replaced ${old.length} flat-rate option(s) with calculated Standard Shipping`)
  }

  const providers = await container.resolve(Modules.TAX).listTaxProviders({})
  const gst = providers.find((p: { id: string }) => p.id === "tp_gst_gst")
  const { data: regions } = await query.graph({ entity: "tax_region", fields: ["id", "provider_id"], filters: { country_code: "in", parent_id: null } })
  if (gst && regions[0] && regions[0].provider_id !== gst.id) {
    await updateTaxRegionsWorkflow(container).run({ input: [{ id: regions[0].id, provider_id: gst.id }] })
    logger.info(`Tax: India tax region now uses ${gst.id}`)
  }
}
