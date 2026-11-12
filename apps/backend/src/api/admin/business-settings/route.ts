import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { stateCode } from "../../../lib/gst-invoice"
import { INVOICE_MODULE } from "../../../modules/invoice"
import type InvoiceModuleService from "../../../modules/invoice/service"
import type { BusinessSettingsBody } from "../../validators"
import { syncTaxProvider } from "../../../lib/gst-scheme"

// Admin → Business details: seller block on invoices + return window.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const s = await req.scope.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings()
  res.json({ settings: s, state_code: stateCode(s.state) })
}

export async function POST(req: MedusaRequest<BusinessSettingsBody>, res: MedusaResponse) {
  const svc = req.scope.resolve<InvoiceModuleService>(INVOICE_MODULE)
  const b = req.validatedBody
  if (!stateCode(b.state)) return res.status(400).json({ message: `"${b.state}" is not an Indian state or union territory name.` })
  if (b.gstin && b.gstin.slice(0, 2) !== stateCode(b.state)) {
    return res.status(400).json({ message: `The GSTIN starts with ${b.gstin.slice(0, 2)}, but ${b.state}'s GST state code is ${stateCode(b.state)}.` })
  }
  if (b.gst_scheme === "composition" && b.bill_of_supply_prefix === b.invoice_prefix) {
    return res.status(400).json({ message: "Use a different prefix for Bills of Supply than for tax invoices." })
  }
  const current = await svc.getSettings()
  // GST scheme: switch the India tax region's provider first (composition = no tax lines),
  // so a failure leaves the setting unchanged.
  if (b.gst_scheme !== current.gst_scheme) await syncTaxProvider(req.scope, b.gst_scheme)
  const s = await svc.updateBusinessSettings({ id: current.id, ...b })
  // One return window everywhere: the storefront's returns policy page and
  // product pages read it from region metadata (region-store-policies.ts).
  const regions = req.scope.resolve(Modules.REGION)
  for (const r of await regions.listRegions({}, { select: ["id", "metadata"] })) {
    await regions.updateRegions(r.id, { metadata: { ...(r.metadata ?? {}), return_window_days: b.return_window_days } })
  }
  res.json({ settings: s, state_code: stateCode(s.state) })
}
