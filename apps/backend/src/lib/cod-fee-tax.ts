import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createTaxRatesWorkflow, deleteTaxRatesWorkflow, updateTaxRatesWorkflow } from "@medusajs/medusa/core-flows"
import { COD_FEE_TAX_TYPE } from "../modules/gst-tax/service"

/**
 * GST on the COD fee (Admin → COD & payments):
 *  - "fixed": a tax override in the India region targeting product type "cod_fee"
 *    (visible in Settings → Tax Regions too);
 *  - "goods": no override; the GST tax provider uses the cart's highest goods rate.
 */
export async function syncCodFeeTax(container: MedusaContainer, mode: "goods" | "fixed", rate: number) {
  const {
    data: [region],
  } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "tax_region",
    fields: ["id", "tax_rates.id", "tax_rates.rate", "tax_rates.rules.reference", "tax_rates.rules.reference_id"],
    filters: { country_code: "in", parent_id: null },
  })
  if (!region) return
  const existing = (region.tax_rates ?? []).filter((r) =>
    r?.rules?.some((x) => x?.reference === "product_type" && x?.reference_id === COD_FEE_TAX_TYPE)
  ) as { id: string; rate: number | null }[]

  if (mode === "goods") {
    if (existing.length) await deleteTaxRatesWorkflow(container).run({ input: { ids: existing.map((r) => r.id) } })
    return
  }
  if (existing[0]) {
    if (existing[0].rate !== rate) {
      await updateTaxRatesWorkflow(container).run({ input: { selector: { id: existing[0].id }, update: { rate } } })
    }
    return
  }
  await createTaxRatesWorkflow(container).run({
    input: [
      {
        tax_region_id: region.id,
        name: "GST (COD fee)",
        code: "GST",
        rate,
        rules: [{ reference: "product_type", reference_id: COD_FEE_TAX_TYPE }],
      },
    ],
  })
}
