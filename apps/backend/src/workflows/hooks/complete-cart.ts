import { MedusaError, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { COD_FEE_ITEM_TYPE, COD_PROVIDER_ID, codEligibility, PREPAID_PROMO_CODE } from "../../lib/cod"
import { courierCodAvailable } from "../../lib/shipments"
import { COD_MODULE } from "../../modules/cod"
import type CodModuleService from "../../modules/cod/service"

type Item = { unit_price: number; quantity: number; metadata?: Record<string, unknown> | null }

/**
 * Last line of defence when an order is placed (ARCHITECTURE.md §5): the COD
 * fee, COD eligibility and the prepaid discount are re-checked on the server,
 * whatever the browser sent.
 */
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const sessions = (cart.payment_collection?.payment_sessions ?? []) as { provider_id: string }[]
  const isCod = sessions.some((s) => s.provider_id === COD_PROVIDER_ID)
  const items = (cart.items ?? []) as Item[]
  const feeLines = items.filter((i) => i.metadata?.type === COD_FEE_ITEM_TYPE)

  if (!isCod) {
    if (feeLines.length) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A Cash on Delivery fee can't be charged on an online payment. Please choose the payment method again.")
    }
    return
  }

  const cod = container.resolve<CodModuleService>(COD_MODULE)
  const settings = await cod.getSettings()
  const merchandiseTotal = items
    .filter((i) => i.metadata?.type !== COD_FEE_ITEM_TYPE)
    .reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0)
  const pincode = (cart.shipping_address as { postal_code?: string } | null)?.postal_code ?? null
  const eligibility = codEligibility(settings, {
    merchandiseTotal,
    pincode,
    pincodeBlocked: pincode ? await cod.isPincodeBlocked(pincode) : false,
    courierCod: await courierCodAvailable(container, pincode),
  })
  if (!eligibility.eligible) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Cash on Delivery is not available for this order (${eligibility.reason}).`)
  }

  const expectedLines = settings.cod_fee > 0 ? 1 : 0
  if (feeLines.length !== expectedLines || (expectedLines && Number(feeLines[0].unit_price) !== settings.cod_fee)) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The Cash on Delivery fee has changed. Please choose the payment method again.")
  }

  const promoIds = ((cart.promotions ?? []) as { id: string }[]).map((p) => p.id)
  if (promoIds.length) {
    const prepaid = await container.resolve(Modules.PROMOTION).listPromotions({ id: promoIds, code: PREPAID_PROMO_CODE })
    if (prepaid.length) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "The online-payment discount can't be used with Cash on Delivery.")
    }
  }
})
