import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { listShippingOptionsForCartWithPricingWorkflow } from "@medusajs/medusa/core-flows"
import { merchandiseSubtotal } from "../../lib/shipping"
import { getRegionPolicies } from "../../lib/region-store-policies"

/**
 * Gives the shipping provider what Medusa's default context lacks: the product
 * subtotal after coupons, without the COD fee or prepaid discount, plus the
 * region's shipping rate and free-shipping threshold (Admin → Regions → metadata).
 * Every shipping price (listing, adding, refreshing a cart) goes through this workflow.
 */
listShippingOptionsForCartWithPricingWorkflow.hooks.setCalculatedShippingPricingContext(async ({ input }, { container }) => {
  const cartId = (input as { cart_id?: string }).cart_id
  if (!cartId) return new StepResponse({})
  const {
    data: [cart],
  } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "cart",
    fields: ["items.unit_price", "items.quantity", "items.metadata", "items.adjustments.amount", "items.adjustments.code", "region.metadata"],
    filters: { id: cartId },
  })
  if (!cart) return new StepResponse({})
  const policy = getRegionPolicies(cart.region?.metadata as Record<string, unknown> | null)
  return new StepResponse({
    merchandise_subtotal: merchandiseSubtotal((cart.items ?? []) as never),
    shipping_rate: policy.shipping_rate,
    free_shipping_threshold: policy.free_shipping_threshold,
  })
})
