import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { validateSettings } from "../../../lib/cod"
import { syncPrepaidPromotion } from "../../../lib/payment-choice"
import { syncCodFeeTax } from "../../../lib/cod-fee-tax"
import { COD_MODULE } from "../../../modules/cod"
import CodModuleService, { SETTINGS_ID } from "../../../modules/cod/service"
import type { UpdatePaymentSettingsBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const cod = req.scope.resolve<CodModuleService>(COD_MODULE)
  res.json({ settings: await cod.getSettings(), blocked_count: await cod.listCodBlockedPincodes({}, { select: ["id"] }).then((r) => r.length) })
}

export async function POST(req: AuthenticatedMedusaRequest<UpdatePaymentSettingsBody>, res: MedusaResponse) {
  const error = validateSettings(req.validatedBody)
  if (error) throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
  const cod = req.scope.resolve<CodModuleService>(COD_MODULE)
  await cod.getSettings()
  const settings = await cod.updatePaymentSettings({ id: SETTINGS_ID, ...req.validatedBody })
  // The prepaid discount is a Medusa promotion; keep its % in step (0 = off).
  if (req.validatedBody.prepaid_discount_percent !== undefined) {
    await syncPrepaidPromotion(req.scope, settings.prepaid_discount_percent)
  }
  // GST on the COD fee: fixed % as a tax override, or follow the goods (no override).
  if (req.validatedBody.cod_fee_tax_mode !== undefined || req.validatedBody.cod_fee_tax_rate !== undefined) {
    await syncCodFeeTax(req.scope, settings.cod_fee_tax_mode, settings.cod_fee_tax_rate)
  }
  res.json({ settings })
}
