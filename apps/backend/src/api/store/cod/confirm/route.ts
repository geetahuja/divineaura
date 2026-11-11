import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { verifyConfirmToken } from "../../../../lib/cod"
import { confirmCodOrder, confirmSecret } from "../../../../lib/cod-orders"
import { COD_MODULE } from "../../../../modules/cod"
import type CodModuleService from "../../../../modules/cod/service"
import type { CodConfirmBody } from "../../../validators"

/**
 * Customer COD confirmation via the signed link /confirm/<token>.
 * GET only reads the state (so SMS/WhatsApp link previews can't confirm);
 * POST confirms. Reusing a link is harmless: it reports the current state.
 * Responses never include internal ids.
 */
async function lookup(req: MedusaRequest, token: string) {
  const v = verifyConfirmToken(confirmSecret(), token)
  if (!v.ok) return { state: v.reason as "invalid" | "expired" }
  const [c] = await req.scope.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: v.orderId })
  if (!c) return { state: "invalid" as const }
  const {
    data: [o],
  } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["display_id", "total", "currency_code", "items.product_title", "items.quantity", "items.metadata"],
    filters: { id: v.orderId },
  })
  const order = o && {
    display_id: o.display_id,
    total: o.total,
    currency_code: o.currency_code,
    items: (o.items ?? []).filter((i) => i?.metadata?.type !== "cod_fee").map((i) => ({ title: i!.product_title, quantity: i!.quantity })),
  }
  return { state: c.status as "pending" | "confirmed" | "cancelled", order, orderId: v.orderId }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { state, order } = await lookup(req, String(req.query.token ?? "")) as { state: string; order?: unknown }
  res.json({ state, order })
}

export async function POST(req: MedusaRequest<CodConfirmBody>, res: MedusaResponse) {
  const r = await lookup(req, req.validatedBody.token)
  if (r.state !== "pending" || !("orderId" in r)) {
    return res.json({ state: r.state, order: "order" in r ? r.order : undefined, changed: false })
  }
  const t = await confirmCodOrder(req.scope, r.orderId, "customer")
  res.json({ state: t.status, order: r.order, changed: t.changed })
}
