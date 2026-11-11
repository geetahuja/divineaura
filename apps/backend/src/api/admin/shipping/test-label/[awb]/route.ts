import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { pickupLocation } from "../../../../../lib/shipments"
import { SHIPPING_MODULE } from "../../../../../modules/shipping"
import type ShippingModuleService from "../../../../../modules/shipping/service"

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

// Printable label for TEST-courier shipments (Shiprocket returns its own PDF label).
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const [s] = await req.scope.resolve<ShippingModuleService>(SHIPPING_MODULE).listShipments({ awb: req.params.awb })
  if (!s || s.courier !== "test") throw new MedusaError(MedusaError.Types.NOT_FOUND, "Label not found")
  const {
    data: [o],
  } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["display_id", "total", "shipping_address.*", "payment_collections.payments.provider_id"],
    filters: { id: s.order_id },
  })
  const a = o?.shipping_address
  const cod = o?.payment_collections?.some((pc) => pc?.payments?.some((p) => p?.provider_id === "pp_cod_cod"))
  const from = await pickupLocation(req.scope)
  res.setHeader("content-type", "text/html; charset=utf-8")
  res.send(`<!doctype html><meta charset="utf-8"><title>Label ${esc(s.awb)}</title>
<body style="font-family:Arial,sans-serif;max-width:400px;margin:20px auto;border:2px solid #000;padding:16px">
<p style="margin:0;font-size:12px">TEST COURIER — NOT A REAL LABEL</p>
<h2 style="margin:8px 0">${esc(s.courier_name)}</h2>
<p style="font:bold 28px monospace;letter-spacing:2px;margin:8px 0">${esc(s.awb)}</p>
<p><b>Order #${esc(o?.display_id)}</b> · ${(s.weight_g / 1000).toFixed(2)} kg · ${cod ? `<b>COD ₹${esc(o?.total)}</b>` : "PREPAID"}</p>
<hr><p><b>To:</b><br>${esc(a?.first_name)} ${esc(a?.last_name)}<br>${esc(a?.address_1)} ${esc(a?.address_2)}<br>${esc(a?.city)}, ${esc(a?.province)} ${esc(a?.postal_code)}<br>${esc(a?.phone)}</p>
<hr><p><b>From:</b><br>${esc(from?.name)}<br>${esc(from?.address1)}<br>${esc(from?.city)} ${esc(from?.pincode)}</p>
<button onclick="print()">Print</button></body>`)
}
