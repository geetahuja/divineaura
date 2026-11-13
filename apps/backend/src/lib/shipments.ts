import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import { randomUUID } from "node:crypto"
import { COD_FEE_ITEM_TYPE, COD_PROVIDER_ID } from "./cod"
import { availableCourierIds, COURIER_LABEL, courierById, defaultCourierId, getCourier, shippingDefaults, TrackingEvent } from "./couriers"
import { gstScheme, insideSupplyArea } from "./gst-scheme"
import { signTestCourier, TEST_COURIER_SIGNATURE_HEADER } from "./couriers/test"
import { canAdvance, fillGaps, isValidPin, shipmentWeightGrams, TIMELINE, TimelineStatus } from "./shipping"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"
import type { MessageEvent } from "../modules/messaging/templates"
import { notifyOrder } from "./notify"
import { documentUrl, getOrIssueInvoice } from "./invoices"
import { SHIPPING_MODULE } from "../modules/shipping"
import type ShippingModuleService from "../modules/shipping/service"

/**
 * Shipping & order timeline (ARCHITECTURE.md §5.8–9, §10). Couriers come from
 * src/lib/couriers (Shiprocket, manual, test; default + per-order override); this file holds the
 * business flow so routes, webhooks, jobs and subscribers all share it.
 */

const svc = (c: MedusaContainer) => c.resolve<ShippingModuleService>(SHIPPING_MODULE)
const query = (c: MedusaContainer) => c.resolve(ContainerRegistrationKeys.QUERY)
const lock = <T>(c: MedusaContainer, key: string, fn: () => Promise<T>) => c.resolve(Modules.LOCKING).execute(key, fn, { timeout: 30 })

// Timeline step → customer message (ARCHITECTURE.md §10). "confirmed" only for paid
// online orders (COD sends cod_confirmed from confirmCodOrder); "placed" for COD sends
// the confirm-link request from startCodConfirmation.
const MESSAGE_FOR: Partial<Record<TimelineStatus, MessageEvent>> = {
  shipped: "order_shipped",
  out_for_delivery: "out_for_delivery",
  delivered: "order_delivered",
  rto: "order_rto",
  cancelled: "order_cancelled",
}

type OrderRow = {
  id: string
  display_id: number
  created_at: string | Date
  total: number
  item_subtotal?: number
  email?: string | null
  status: string
  shipping_address?: { first_name?: string; last_name?: string; phone?: string; address_1?: string; address_2?: string | null; city?: string; province?: string; postal_code?: string } | null
  items?: { id: string; title: string; product_title?: string; variant_sku?: string | null; quantity: number; unit_price: number; metadata?: Record<string, unknown> | null; product_id?: string | null }[]
  payment_collections?: { payments?: { id: string; provider_id: string; captured_at?: string | null }[] }[]
  fulfillments?: { id: string }[]
}

async function loadOrder(c: MedusaContainer, orderId: string): Promise<OrderRow> {
  const { data } = await query(c).graph({
    entity: "order",
    fields: [
      "id", "display_id", "created_at", "total", "item_subtotal", "email", "status",
      "shipping_address.*", "items.id", "items.title", "items.product_title", "items.variant_sku", "items.quantity",
      "items.unit_price", "items.metadata", "items.product_id",
      "payment_collections.payments.id", "payment_collections.payments.provider_id", "payment_collections.payments.captured_at",
      "fulfillments.id",
    ],
    filters: { id: orderId },
  })
  if (!data[0]) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  return data[0] as unknown as OrderRow
}

const isCod = (o: OrderRow) => !!o.payment_collections?.some((pc) => pc.payments?.some((p) => p.provider_id === COD_PROVIDER_ID))

// ── Timeline ───────────────────────────────────────────────────────────────
export async function listEvents(c: MedusaContainer, orderId: string) {
  return svc(c).listOrderEvents({ order_id: orderId }, { order: { occurred_at: "ASC" } })
}

/** Records a timeline step if the rules allow it (idempotent; unique per order+status). */
export async function recordEvent(
  c: MedusaContainer,
  orderId: string,
  status: TimelineStatus,
  source: string,
  opts: { at?: Date; note?: string; notify?: boolean } = {}
) {
  return lock(c, `timeline:${orderId}`, async () => {
    const recorded = (await listEvents(c, orderId)).map((e) => e.status as TimelineStatus)
    // An order always starts at "placed", even if its first event is a later one.
    if (!recorded.includes("placed") && status !== "placed") {
      const o = await loadOrder(c, orderId)
      await svc(c).createOrderEvents({ order_id: orderId, status: "placed", occurred_at: new Date(o.created_at), source: "order" })
      recorded.push("placed")
    }
    if (!canAdvance(recorded, status)) return false
    await svc(c).createOrderEvents({ order_id: orderId, status, occurred_at: opts.at ?? new Date(), source, note: opts.note ?? null })
    if (opts.notify !== false) {
      const event = status === "confirmed" && source === "payment" ? "order_placed" : MESSAGE_FOR[status]
      if (event) {
        const [shipment] = await svc(c).listShipments({ order_id: orderId })
        // Shipped email links the GST invoice (signed link, no login needed).
        const invoice = event === "order_shipped" ? await getOrIssueInvoice(c, orderId).catch(() => null) : null
        const extra: Record<string, string> =
          event === "order_shipped"
            ? { courier: shipment?.courier_name ?? "our courier", invoice: invoice ? documentUrl("invoice", invoice.id) : `${(process.env.STOREFRONT_URL ?? "").replace(/\/$/, "")}/account/orders`, ...(shipment?.tracking_url ? { link: shipment.tracking_url } : {}) }
            : event === "order_cancelled"
              ? { reason: opts.note ?? "cancelled by the seller" }
              : {}
        await notifyOrder(c, event as never, orderId, extra)
      }
    }
    return true
  })
}

// ── Delivery check (product page + checkout) ──────────────────────────────
export async function pickupLocation(c: MedusaContainer) {
  const { data } = await query(c).graph({ entity: "stock_location", fields: ["id", "name", "address.*"] })
  const loc = data[0]
  const a = loc?.address
  return loc ? { id: loc.id, name: loc.name, address1: a?.address_1 ?? "", address2: a?.address_2 ?? null, city: a?.city ?? "", state: a?.province ?? "", pincode: a?.postal_code ?? "", phone: a?.phone ?? "" } : null
}

export async function deliveryCheck(c: MedusaContainer, pincode: string, weightGrams = 500) {
  if (!isValidPin(pincode)) return { status: "invalid" as const }
  const courier = await getCourier(c)
  const pickup = await pickupLocation(c)
  if (!pickup || !isValidPin(pickup.pincode)) return { status: "unavailable" as const }
  const [s, place, gst] = await Promise.all([
    courier.serviceability({ pickupPin: pickup.pincode, deliveryPin: pincode, weightGrams, cod: true }),
    courier.lookupPincode(pincode),
    gstScheme(c),
  ])
  // GST composition scheme: deliveries only inside the seller's state.
  if (!insideSupplyArea(gst.scheme, gst.sellerState, { pincode, pinState: place?.state })) {
    return { status: "not_serviceable" as const, reason: "outside_state" as const, seller_state: gst.sellerState, city: place?.city ?? null, state: place?.state ?? null }
  }
  if (!s.serviceable) return { status: "not_serviceable" as const, city: place?.city ?? null, state: place?.state ?? null }
  const cod = c.resolve<CodModuleService>(COD_MODULE)
  const settings = await cod.getSettings()
  const codAvailable = settings.cod_enabled && s.cod && !(await cod.isPincodeBlocked(pincode))
  return { status: "serviceable" as const, etaDays: s.etaDays!, cod: codAvailable, city: place?.city ?? null, state: place?.state ?? null }
}

/** Does the courier collect cash at this PIN? undefined = unknown (no courier / no pickup PIN). */
export async function courierCodAvailable(c: MedusaContainer, pincode: string | null | undefined) {
  const courier = await getCourier(c)
  const pickup = await pickupLocation(c)
  if (!pickup || !isValidPin(pickup.pincode) || !pincode || !isValidPin(pincode)) return undefined
  const s = await courier.serviceability({ pickupPin: pickup.pincode, deliveryPin: pincode, weightGrams: 500, cod: true })
  return s.serviceable && s.cod
}

// ── Shipments ──────────────────────────────────────────────────────────────
async function codGate(c: MedusaContainer, o: OrderRow) {
  if (!isCod(o)) return
  const [conf] = await c.resolve<CodModuleService>(COD_MODULE).listCodConfirmations({ order_id: o.id })
  if (conf?.status !== "confirmed") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This Cash on Delivery order isn't confirmed yet. Confirm it (link or COD queue) before shipping.")
  }
}

export async function shippingOverview(c: MedusaContainer, orderId: string, courierOverride?: string | null) {
  const o = await loadOrder(c, orderId)
  const [shipment] = await svc(c).listShipments({ order_id: orderId })
  const pickup = await pickupLocation(c)
  const available = availableCourierIds()
  const defaultId = await defaultCourierId(c)
  const selected = courierOverride && available.includes(courierOverride as never) ? courierOverride : defaultId
  const courier = courierById(c, selected)
  const weight = await orderWeight(c, o)
  const ids = (o.items ?? []).map((i) => i.product_id).filter((x): x is string => !!x)
  const fragile = ids.length
    ? (await query(c).graph({ entity: "product", fields: ["id", "product_specs.liquid_fragile"], filters: { id: ids } })).data.some((p) => (p as { product_specs?: { liquid_fragile?: boolean | null } }).product_specs?.liquid_fragile)
    : false
  let options = null as Awaited<ReturnType<NonNullable<typeof courier>["serviceability"]>> | null
  if (!shipment && courier && pickup && isValidPin(pickup.pincode) && o.shipping_address?.postal_code) {
    options = await courier.serviceability({ pickupPin: pickup.pincode, deliveryPin: o.shipping_address.postal_code, weightGrams: weight, cod: isCod(o) })
  }
  let codReady = true
  try {
    await codGate(c, o)
  } catch {
    codReady = false
  }
  const cs = await svc(c).getCourierSettings()
  return {
    courier: courier?.id ?? null,
    default_courier: defaultId,
    couriers: available.map((id) => ({ id, label: COURIER_LABEL[id] })),
    manual_defaults: { courier_name: cs.manual_courier_name, tracking_url_template: cs.manual_tracking_url },
    pickup_ready: !!pickup && isValidPin(pickup.pincode),
    weight_g: weight,
    liquid_fragile: fragile, // Goda Jal etc.: pack upright, leak-proof, marked fragile
    is_cod: isCod(o),
    cod_ready: codReady,
    shipment: shipment ?? null,
    options,
    events: await listEvents(c, orderId),
    cancelled: o.status === "canceled",
  }
}

async function orderWeight(c: MedusaContainer, o: OrderRow) {
  const goods = (o.items ?? []).filter((i) => i.metadata?.type !== COD_FEE_ITEM_TYPE)
  const ids = goods.map((i) => i.product_id).filter((x): x is string => !!x)
  const { data } = ids.length
    ? await query(c).graph({ entity: "product", fields: ["id", "product_specs.weight_g", "product_specs.hsn_code"], filters: { id: ids } })
    : { data: [] }
  const specs = new Map(data.map((p) => [p.id, (p as { product_specs?: { weight_g?: number | null } }).product_specs]))
  return shipmentWeightGrams(goods.map((i) => ({ quantity: i.quantity, weight_g: specs.get(i.product_id ?? "")?.weight_g })), shippingDefaults())
}

export async function markPacked(c: MedusaContainer, orderId: string) {
  const o = await loadOrder(c, orderId)
  if (o.status === "canceled") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Order is cancelled")
  await codGate(c, o)
  return recordEvent(c, orderId, "packed", "admin")
}

/** Books the courier, stores AWB + label, creates Medusa's fulfillment, and moves the timeline to Shipped. */
export async function createShipment(
  c: MedusaContainer,
  orderId: string,
  courierId?: string | null,
  opts: { provider?: string | null; manual?: { courierName?: string | null; awb: string; trackingUrl?: string | null } | null } = {}
) {
  return lock(c, `shipment:${orderId}`, async () => {
    const [existing] = await svc(c).listShipments({ order_id: orderId })
    if (existing) return existing
    const o = await loadOrder(c, orderId)
    if (o.status === "canceled") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Order is cancelled")
    await codGate(c, o)
    const providerId = opts.provider ?? (await defaultCourierId(c))
    if (!availableCourierIds().includes(providerId as never)) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Courier "${providerId}" is not configured`)
    const courier = courierById(c, providerId)!
    if (courier.id === "manual" && !opts.manual?.awb?.trim()) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enter the courier's AWB / tracking number")
    const pickup = await pickupLocation(c)
    if (!pickup || !isValidPin(pickup.pincode)) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Set the warehouse PIN code and address in Settings → Locations first.")
    }
    const a = o.shipping_address ?? {}
    const goods = (o.items ?? []).filter((i) => i.metadata?.type !== COD_FEE_ITEM_TYPE)
    const weight = await orderWeight(c, o)
    const result = await courier.createShipment({
      orderNumber: String(o.display_id),
      orderDate: new Date(o.created_at),
      paymentMethod: isCod(o) ? "cod" : "prepaid",
      total: Number(o.total),
      subTotal: Number(o.total),
      weightGrams: weight,
      pickup: { ...pickup, name: pickup.name, nickname: null },
      to: {
        name: [a.first_name, a.last_name].filter(Boolean).join(" "),
        phone: a.phone ?? "",
        email: o.email,
        address1: a.address_1 ?? "",
        address2: a.address_2,
        city: a.city ?? "",
        state: a.province ?? "",
        pincode: a.postal_code ?? "",
      },
      items: goods.map((i) => ({ name: i.product_title ?? i.title, sku: i.variant_sku ?? i.id, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
      courierId,
      manual: opts.manual ?? null,
    }).catch((e: Error) => {
      throw e instanceof MedusaError ? e : new MedusaError(MedusaError.Types.INVALID_DATA, e.message)
    })

    // Medusa's own fulfillment, so the native order page shows it as shipped with the label.
    const shippable = (o.items ?? []).filter((i) => i.metadata?.type !== COD_FEE_ITEM_TYPE)
    const { result: fulfillment } = await createOrderFulfillmentWorkflow(c).run({
      input: {
        order_id: orderId,
        location_id: pickup.id,
        items: shippable.map((i) => ({ id: i.id, quantity: i.quantity })),
        metadata: { awb: result.awb, courier: courier.id, courier_name: result.courierName },
      },
    })
    await createOrderShipmentWorkflow(c).run({
      input: {
        order_id: orderId,
        fulfillment_id: fulfillment.id,
        items: shippable.map((i) => ({ id: i.id, quantity: i.quantity })),
        labels: [{ tracking_number: result.awb, tracking_url: result.trackingUrl ?? "", label_url: result.labelUrl ?? "" }],
      },
    })
    const shipment = await svc(c).createShipments({
      order_id: orderId,
      fulfillment_id: fulfillment.id,
      courier: courier.id,
      courier_name: result.courierName,
      external_id: result.shipmentId,
      awb: result.awb,
      label_url: result.labelUrl,
      tracking_url: result.trackingUrl,
      weight_g: weight,
    })
    await recordEvent(c, orderId, "packed", "admin", { notify: false })
    await recordEvent(c, orderId, "shipped", "admin", { note: `${result.courierName} · AWB ${result.awb}` })
    return shipment
  })
}

/**
 * Applies a courier tracking event (webhook or sync). Duplicate and out-of-order
 * events are ignored by the timeline rules. Delivered also completes Medusa's
 * fulfillment and, for COD, records the cash as collected (payment captured).
 */
export async function applyTrackingEvent(c: MedusaContainer, ev: TrackingEvent, source: "webhook" | "sync" | "admin") {
  const [shipment] = await svc(c).listShipments({ awb: ev.awb })
  if (!shipment) return { applied: [] as TimelineStatus[], reason: "unknown_awb" }
  const recorded = (await listEvents(c, shipment.order_id)).map((e) => e.status as TimelineStatus)
  const applied: TimelineStatus[] = []
  for (const status of fillGaps(recorded, ev.status)) {
    if (await recordEvent(c, shipment.order_id, status, source, { at: ev.at })) applied.push(status)
  }
  if (applied.includes("delivered")) {
    if (shipment.fulfillment_id) {
      await markOrderFulfillmentAsDeliveredWorkflow(c).run({ input: { orderId: shipment.order_id, fulfillmentId: shipment.fulfillment_id } }).catch(() => undefined)
    }
    const o = await loadOrder(c, shipment.order_id)
    const codPayment = o.payment_collections?.flatMap((pc) => pc.payments ?? []).find((p) => p.provider_id === COD_PROVIDER_ID && !p.captured_at)
    if (codPayment) await capturePaymentWorkflow(c).run({ input: { payment_id: codPayment.id } })
  }
  return { applied }
}

/** DEVELOPMENT (test courier): sends the next tracking event as a signed webhook. */
export async function simulateNextTrackingEvent(c: MedusaContainer, orderId: string, status?: TimelineStatus) {
  const [shipment] = await svc(c).listShipments({ order_id: orderId })
  if (!shipment || shipment.courier !== "test") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Only test-courier shipments can be simulated")
  const recorded = (await listEvents(c, orderId)).map((e) => e.status as TimelineStatus)
  const next = status ?? TIMELINE.find((s) => TIMELINE.indexOf(s) > Math.max(...recorded.map((r) => TIMELINE.indexOf(r as never))))
  if (!next) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "No further tracking events")
  const body = JSON.stringify({ awb: shipment.awb, status: next, event_id: `evt_${randomUUID()}`, at: new Date().toISOString() })
  const base = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
  const r = await fetch(`${base}/hooks/shipping/test`, {
    method: "POST",
    headers: { "content-type": "application/json", [TEST_COURIER_SIGNATURE_HEADER]: signTestCourier(process.env.TEST_COURIER_WEBHOOK_SECRET!, body) },
    body,
  })
  if (!r.ok) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Tracking webhook rejected (${r.status})`)
  return { sent: next }
}

/** Manual courier: admin moves the shipment along (shipped → out for delivery → delivered / RTO). */
export async function updateManualStatus(c: MedusaContainer, orderId: string, status: TimelineStatus, trackingUrl?: string | null) {
  const [shipment] = await svc(c).listShipments({ order_id: orderId })
  if (!shipment || shipment.courier !== "manual") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Only manual-courier shipments are updated by hand")
  if (trackingUrl !== undefined && trackingUrl !== shipment.tracking_url) {
    if (trackingUrl && !/^https?:\/\//.test(trackingUrl)) throw new MedusaError(MedusaError.Types.INVALID_DATA, "The tracking link must start with https://")
    await svc(c).updateShipments({ id: shipment.id, tracking_url: trackingUrl || null })
  }
  return applyTrackingEvent(c, { awb: shipment.awb, status, at: new Date(), eventId: `admin_${randomUUID()}` }, "admin")
}

