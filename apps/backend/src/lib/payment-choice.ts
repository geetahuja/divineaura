import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, PromotionActions } from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  createPromotionsWorkflow,
  deleteLineItemsWorkflow,
  updateCartPromotionsWorkflow,
  updatePromotionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { COD_MODULE } from "../modules/cod"
import { COD_FEE_TAX_TYPE } from "../modules/gst-tax/service"
import type CodModuleService from "../modules/cod/service"
import { COD_FEE_ITEM_TYPE, codEligibility, PREPAID_PROMO_CODE, prepaidSaving } from "./cod"
import { courierCodAvailable } from "./shipments"

/**
 * Server-side pricing of the payment choice (ARCHITECTURE.md §5 rules 5–6):
 *  - COD: adds a non-discountable "Cash on Delivery fee" line, never the prepaid discount.
 *  - Online: applies the prepaid-discount promotion (Medusa calculates the amount).
 * The complete-cart guard re-checks all of this when the order is placed.
 *
 * ponytail: the fee line counts toward Medusa's item_total, which the free-shipping
 * rule uses, so a cart ₹(threshold−fee)…threshold gets free shipping with COD (and
 * the prepaid discount can drop a cart just above the threshold below it). Both
 * bands are narrow; fixing them needs a custom free-shipping rule.
 */

type CartItem = { id: string; unit_price: number; quantity: number; metadata?: Record<string, unknown> | null }

const codService = (c: MedusaContainer) => c.resolve<CodModuleService>(COD_MODULE)

export const isCodFeeItem = (i: CartItem) => i.metadata?.type === COD_FEE_ITEM_TYPE

export async function loadCartForPayment(container: MedusaContainer, cartId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [cart],
  } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at", "items.id", "items.unit_price", "items.quantity", "items.metadata", "shipping_address.postal_code", "promotions.code"],
    filters: { id: cartId },
  })
  if (!cart || cart.completed_at) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }
  const items = (cart.items ?? []) as CartItem[]
  const merchandiseTotal = items.filter((i) => !isCodFeeItem(i)).reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0)
  const pincode = cart.shipping_address?.postal_code ?? null
  const settings = await codService(container).getSettings()
  const eligibility = codEligibility(settings, {
    merchandiseTotal,
    pincode,
    pincodeBlocked: pincode ? await codService(container).isPincodeBlocked(pincode) : false,
    courierCod: await courierCodAvailable(container, pincode),
  })
  return {
    cart,
    settings,
    merchandiseTotal,
    feeItems: items.filter(isCodFeeItem),
    prepaidApplied: (cart.promotions ?? []).some((p) => p?.code === PREPAID_PROMO_CODE),
    eligibility,
    saving: prepaidSaving(merchandiseTotal, settings.prepaid_discount_percent),
  }
}

export async function applyPaymentChoice(container: MedusaContainer, cartId: string, method: "cod" | "online") {
  const ctx = await loadCartForPayment(container, cartId)

  if (method === "cod") {
    if (!ctx.eligibility.eligible) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Cash on Delivery is not available for this order (${ctx.eligibility.reason})`)
    }
    if (ctx.prepaidApplied) {
      await updateCartPromotionsWorkflow(container).run({ input: { cart_id: cartId, promo_codes: [PREPAID_PROMO_CODE], action: PromotionActions.REMOVE } })
    }
    const fee = ctx.settings.cod_fee
    const current = ctx.feeItems
    // Exactly one fee line at the current fee amount.
    if (current.length !== 1 || Number(current[0].unit_price) !== fee) {
      if (current.length) {
        await deleteLineItemsWorkflow(container).run({ input: { cart_id: cartId, ids: current.map((i) => i.id) } })
      }
      if (fee > 0) {
        await addToCartWorkflow(container).run({
          input: {
            cart_id: cartId,
            items: [
              {
                title: "Cash on Delivery fee",
                quantity: 1,
                unit_price: fee,
                is_tax_inclusive: true,
                is_discountable: false,
                requires_shipping: false,
                metadata: { type: COD_FEE_ITEM_TYPE },
                // Lets the GST tax provider / a fixed-rate override find this line.
                // Supported at runtime (prepare-line-item-data copies item.product_type_id)
                // but missing from the TS type in Medusa 2.22.
                ...({ product_type_id: COD_FEE_TAX_TYPE } as object),
              },
            ],
          },
        })
      }
    }
    return
  }

  // Online payment.
  if (ctx.feeItems.length) {
    await deleteLineItemsWorkflow(container).run({ input: { cart_id: cartId, ids: ctx.feeItems.map((i) => i.id) } })
  }
  if (ctx.settings.prepaid_discount_percent > 0 && !ctx.prepaidApplied) {
    await updateCartPromotionsWorkflow(container).run({ input: { cart_id: cartId, promo_codes: [PREPAID_PROMO_CODE], action: PromotionActions.ADD } })
  }
}

/** Keeps the prepaid-discount promotion in step with the admin setting (0% = inactive). */
export async function syncPrepaidPromotion(container: MedusaContainer, percent: number) {
  const promotions = container.resolve(Modules.PROMOTION)
  const [existing] = await promotions.listPromotions({ code: PREPAID_PROMO_CODE }, { relations: ["application_method"] })

  if (!existing) {
    if (percent <= 0) return
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: PREPAID_PROMO_CODE,
            type: "standard",
            status: "active",
            is_automatic: false,
            is_tax_inclusive: true,
            application_method: { type: "percentage", target_type: "items", allocation: "across", value: percent },
          },
        ],
      },
    })
    return
  }
  await updatePromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          id: existing.id,
          status: percent > 0 ? "active" : "inactive",
          ...(percent > 0 ? { application_method: { value: percent } } : {}),
        },
      ],
    },
  })
}
