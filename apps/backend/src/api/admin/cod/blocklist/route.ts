import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { parsePincodes } from "../../../../lib/cod"
import { COD_MODULE } from "../../../../modules/cod"
import type CodModuleService from "../../../../modules/cod/service"
import type { AddBlockedPincodesBody } from "../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const pincodes = await req.scope
    .resolve<CodModuleService>(COD_MODULE)
    .listCodBlockedPincodes({}, { select: ["pincode"], order: { pincode: "ASC" } })
  res.json({ pincodes: pincodes.map((p) => p.pincode) })
}

// Add one or many (pasted list separated by spaces, commas or new lines).
export async function POST(req: AuthenticatedMedusaRequest<AddBlockedPincodesBody>, res: MedusaResponse) {
  const { valid, invalid } = parsePincodes(req.validatedBody.pincodes)
  if (!valid.length) throw new MedusaError(MedusaError.Types.INVALID_DATA, "No valid 6-digit PIN codes found")
  const cod = req.scope.resolve<CodModuleService>(COD_MODULE)
  const existing = new Set((await cod.listCodBlockedPincodes({ pincode: valid }, { select: ["pincode"] })).map((p) => p.pincode))
  const fresh = valid.filter((p) => !existing.has(p))
  if (fresh.length) await cod.createCodBlockedPincodes(fresh.map((pincode) => ({ pincode })))
  res.json({ added: fresh.length, already_listed: valid.length - fresh.length, invalid })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const pincode = String(req.query.pincode ?? "")
  const cod = req.scope.resolve<CodModuleService>(COD_MODULE)
  const rows = await cod.listCodBlockedPincodes({ pincode }, { select: ["id"] })
  if (rows.length) await cod.deleteCodBlockedPincodes(rows.map((r) => r.id))
  res.json({ removed: rows.length })
}
