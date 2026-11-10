import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { upsertProductSpecsWorkflow } from "../../../../../workflows/upsert-product-specs"
import type { ProductSpecsBody } from "../../../../validators"

const COUNTRY = "in"

// The GST actually charged for this product: product override, else product-type
// override, else the India default. Edited in Settings → Tax Regions → India.
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
  return {
    specs: (product as { product_specs?: unknown }).product_specs ?? null,
    gst: await effectiveGst(req, product),
  }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json(await load(req))
}

export async function POST(
  req: AuthenticatedMedusaRequest<ProductSpecsBody>,
  res: MedusaResponse
) {
  await upsertProductSpecsWorkflow(req.scope).run({
    input: { product_id: req.params.id, data: req.validatedBody },
  })
  res.json(await load(req))
}
