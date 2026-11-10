import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PRODUCT_SPECS_MODULE } from "../modules/product-specs"
import ProductSpecsModuleService from "../modules/product-specs/service"

export type ProductSpecsInput = {
  product_id: string
  data: Record<string, unknown>
}

type Compensation =
  | { created: true; id: string; product_id: string }
  | { created: false; previous: Record<string, unknown> }

const upsertProductSpecsStep = createStep(
  "upsert-product-specs",
  async ({ product_id, data }: ProductSpecsInput, { container }) => {
    const service: ProductSpecsModuleService = container.resolve(PRODUCT_SPECS_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    const {
      data: [product],
    } = await query.graph({
      entity: "product",
      fields: ["id", "product_specs.*"],
      filters: { id: product_id },
    })
    const existing = (product as { product_specs?: Record<string, unknown> } | undefined)?.product_specs

    if (existing?.id) {
      const updated = await service.updateProductSpecs({ id: existing.id as string, ...data })
      return new StepResponse(updated, { created: false, previous: existing } as Compensation)
    }

    const created = await service.createProductSpecs(data)
    await link.create({
      [Modules.PRODUCT]: { product_id },
      [PRODUCT_SPECS_MODULE]: { product_specs_id: created.id },
    })
    return new StepResponse(created, { created: true, id: created.id, product_id } as Compensation)
  },
  async (comp, { container }) => {
    if (!comp) {
      return
    }
    const service: ProductSpecsModuleService = container.resolve(PRODUCT_SPECS_MODULE)
    if (comp.created) {
      await container.resolve(ContainerRegistrationKeys.LINK).dismiss({
        [Modules.PRODUCT]: { product_id: comp.product_id },
        [PRODUCT_SPECS_MODULE]: { product_specs_id: comp.id },
      })
      await service.deleteProductSpecs(comp.id)
    } else {
      const { created_at, updated_at, deleted_at, ...previous } = comp.previous
      void created_at, void updated_at, void deleted_at
      await service.updateProductSpecs(previous as { id: string })
    }
  }
)

export const upsertProductSpecsWorkflow = createWorkflow(
  "upsert-product-specs",
  (input: ProductSpecsInput) => {
    const specs = upsertProductSpecsStep(input)
    return new WorkflowResponse(specs)
  }
)
