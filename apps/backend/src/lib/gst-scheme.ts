import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, MedusaError } from "@medusajs/framework/utils"
import { updateTaxRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"
import { stateCode } from "./gst-invoice"
import { isValidPin, stateFromPin } from "./shipping"

/**
 * GST scheme (Admin → Business details). Regular = tax invoices, deliveries all
 * over India, taxes exactly as before. Composition = Bill of Supply without tax
 * lines, and deliveries only inside the seller's state (a composition dealer may
 * not make inter-state supplies).
 */
export type GstScheme = "regular" | "composition"
export const REGULAR_TAX_PROVIDER = "tp_gst_gst"
export const COMPOSITION_TAX_PROVIDER = "tp_gst-composition_gst"
export const COMPOSITION_DECLARATION = "Composition taxable person, not eligible to collect tax on supplies"

const settings = (c: MedusaContainer) => c.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings()

export async function gstScheme(c: MedusaContainer): Promise<{ scheme: GstScheme; sellerState: string }> {
  const s = await settings(c)
  return { scheme: (s.gst_scheme as GstScheme) ?? "regular", sellerState: s.state }
}

/**
 * Pure rule: may we deliver to this address under the scheme? Regular: always.
 * Composition: the PIN's state (courier lookup, else the PIN-prefix table) and the
 * address state, when known, must both be the seller's state.
 * ponytail: the PIN-prefix table is per postal circle (e.g. 403xxx Goa sits in the
 * Maharashtra range); the courier's lookup (Shiprocket) is used first when it has one.
 */
export function insideSupplyArea(
  scheme: GstScheme,
  sellerState: string,
  where: { pincode?: string | null; pinState?: string | null; addressState?: string | null }
): boolean {
  if (scheme !== "composition") return true
  const seller = stateCode(sellerState)
  if (!seller) return false
  const pinState = where.pinState ?? (where.pincode && isValidPin(where.pincode) ? stateFromPin(where.pincode) : null)
  if (!pinState || stateCode(pinState) !== seller) return false
  if (where.addressState && stateCode(where.addressState) && stateCode(where.addressState) !== seller) return false
  return true
}

/** Points the India tax region at the scheme's tax provider (no tax lines under composition). */
export async function syncTaxProvider(c: MedusaContainer, scheme: GstScheme) {
  const want = scheme === "composition" ? COMPOSITION_TAX_PROVIDER : REGULAR_TAX_PROVIDER
  const { data } = await c.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "tax_region", fields: ["id", "provider_id"], filters: { country_code: "in", parent_id: null } })
  const region = data[0]
  if (!region || region.provider_id === want) return
  const known = (await c.resolve(Modules.TAX).listTaxProviders({})).some((p: { id: string }) => p.id === want)
  if (!known) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Tax provider ${want} is not registered — restart the backend after updating`)
  await updateTaxRegionsWorkflow(c).run({ input: [{ id: region.id, provider_id: want }] })
}
