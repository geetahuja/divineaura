import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { nextSku, skuPrefix } from "../lib/sku"

// ponytail: in-process queue so variants created together get distinct numbers;
// fine while one worker runs subscribers (§18). Multiple workers would need a DB lock.
let queue: Promise<unknown> = Promise.resolve()

export default async function assignSkuHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  queue = queue.then(() => assignForEvent(event.name, event.data.id, container)).catch((e) =>
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(`SKU auto-assign failed: ${e.message}`)
  )
  await queue
}

async function assignForEvent(name: string, id: string, container: SubscriberArgs["container"]) {
  if (name !== "product.created") {
    return assign(id, container)
  }
  const variants = await container.resolve(Modules.PRODUCT).listProductVariants({ product_id: id }, { select: ["id"] })
  for (const v of variants) {
    await assign(v.id, container)
  }
}

async function assign(variantId: string, container: SubscriberArgs["container"]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [variant],
  } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "product.type.value", "product.type.metadata", "product.tags.value"],
    filters: { id: variantId },
  })
  if (!variant || variant.sku || !variant.product) {
    return // Admin typed a SKU (or the variant is gone): leave it alone.
  }

  const prefix = skuPrefix(variant.product as never)
  const existing = await container
    .resolve(Modules.PRODUCT)
    .listProductVariants({ sku: { $like: `${prefix}-%` } }, { select: ["sku"], withDeleted: true })

  await updateProductVariantsWorkflow(container).run({
    input: {
      selector: { id: variantId },
      update: { sku: nextSku(prefix, existing.map((v) => v.sku ?? "")) },
    },
  })
}

export const config: SubscriberConfig = {
  event: ["product.created", "product-variant.created"],
}
