/**
 * Removes the staging demo catalogue (deploy/server/remove-demo-products.sh,
 * REQUIRED before launch — deploy/GO-LIVE.md): every product tagged "demo" or
 * with metadata.demo, plus placeholder images on Sacred Places.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { SACRED_PLACES_MODULE } from "../modules/sacred-places"
import type SacredPlacesModuleService from "../modules/sacred-places/service"
import { updateSacredPlacesWorkflow } from "../workflows/sacred-places"
import { DEMO_TAG, PLACEHOLDER_CREDIT } from "./seed-demo-catalogue"

export default async function removeDemoCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const products = container.resolve(Modules.PRODUCT)
  const all = await products.listProducts({}, { select: ["id", "handle", "metadata"], relations: ["tags"] })
  const demo = all.filter((p) => p.metadata?.demo === true || p.tags?.some((t) => t.value === DEMO_TAG))
  if (demo.length) await deleteProductsWorkflow(container).run({ input: { ids: demo.map((p) => p.id) } })

  const places = await container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE).listSacredPlaces({ image_credit: PLACEHOLDER_CREDIT })
  if (places.length) await updateSacredPlacesWorkflow(container).run({ input: places.map((p) => ({ id: p.id, image_url: null, image_credit: null })) })

  logger.info(`Removed ${demo.length} demo products (${demo.map((p) => p.handle).join(", ") || "none"}) and ${places.length} placeholder place images.`)
}
