import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createTaxRatesWorkflow,
  deleteTaxRatesWorkflow,
  updateTaxRatesWorkflow,
} from "@medusajs/medusa/core-flows"
import { upsertProductSpecsWorkflow } from "../../../../../workflows/upsert-product-specs"
import type { AdminProductSpecsBody } from "../../../../validators"

const COUNTRY = "in"

// The GST actually charged for this product: product override, else product-type
// override, else the India default. All live in Settings → Tax Regions → India,
// so checkout tax is computed by Medusa's tax module from one source.
async function effectiveGst(
  req: AuthenticatedMedusaRequest,
  product: { id: string; type_id?: string | null }
) {
  const [line] = await req.scope.resolve(Modules.TAX).getTaxLines(
    [
      {
        id: product.id,
        product_id: product.id,
        product_type_id: product.type_id ?? undefined,
        quantity: 1,
        unit_price: 100,
        currency_code: "inr",
      },
    ],
    { address: { country_code: COUNTRY } }
  )
  return line ? { rate: line.rate, name: line.name, code: line.code } : null
}

// Product-level GST override rates (tax rates with a `product` rule for this product).
async function productOverrides(req: AuthenticatedMedusaRequest, productId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "tax_rates.id", "tax_rates.rate", "tax_rates.rules.reference", "tax_rates.rules.reference_id"],
    filters: { country_code: COUNTRY, parent_id: null },
  })
  const region = regions[0]
  if (!region) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "India tax region is missing")
  }
  const rates = (region.tax_rates ?? []).filter((r) =>
    r?.rules?.some((rule) => rule?.reference === "product" && rule?.reference_id === productId)
  )
  return { regionId: region.id, rates: rates as { id: string; rate: number | null }[] }
}

async function setProductGst(req: AuthenticatedMedusaRequest, productId: string, rate: number | null) {
  const { regionId, rates } = await productOverrides(req, productId)
  const [current, ...extra] = rates

  if (rate === null) {
    if (rates.length) {
      await deleteTaxRatesWorkflow(req.scope).run({ input: { ids: rates.map((r) => r.id) } })
    }
    return
  }
  if (extra.length) {
    await deleteTaxRatesWorkflow(req.scope).run({ input: { ids: extra.map((r) => r.id) } })
  }
  if (current) {
    if (current.rate !== rate) {
      await updateTaxRatesWorkflow(req.scope).run({
        input: { selector: { id: current.id }, update: { rate, updated_by: req.auth_context.actor_id } },
      })
    }
    return
  }
  await createTaxRatesWorkflow(req.scope).run({
    input: [
      {
        tax_region_id: regionId,
        name: "GST",
        code: "GST",
        rate,
        rules: [{ reference: "product", reference_id: productId }],
        created_by: req.auth_context.actor_id,
      },
    ],
  })
}

async function load(req: AuthenticatedMedusaRequest) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [product],
  } = await query.graph(
    {
      entity: "product",
      fields: ["id", "type_id", "product_specs.*"],
      filters: { id: req.params.id },
    },
    { throwIfKeyNotFound: true }
  )
  const { rates } = await productOverrides(req, product.id)
  return {
    specs: (product as { product_specs?: unknown }).product_specs ?? null,
    gst: await effectiveGst(req, product),
    // Rate set on this product itself; null = inherits type override / India default.
    gst_override: rates[0]?.rate ?? null,
  }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await load(req))
}

export async function POST(req: AuthenticatedMedusaRequest<AdminProductSpecsBody>, res: MedusaResponse) {
  const { gst_rate, ...specs } = req.validatedBody
  await upsertProductSpecsWorkflow(req.scope).run({
    input: { product_id: req.params.id, data: specs },
  })
  if (gst_rate !== undefined) {
    await setProductGst(req, req.params.id, gst_rate)
  }
  res.json(await load(req))
}
