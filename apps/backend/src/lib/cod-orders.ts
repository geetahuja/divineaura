import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"
import { COD_PROVIDER_ID, createConfirmToken } from "./cod"

/**
 * COD order lifecycle (ARCHITECTURE.md §5.5, §10): Pending confirmation →
 * Confirmed (customer link or admin) | Cancelled (admin or auto-cancel job).
 * Every transition runs under a per-order lock and only from "pending", so
 * double taps, retries and the job racing a customer can't double-apply.
 */

export type CodStatus = "pending_confirmation" | "confirmed" | "cancelled"

const cod = (c: MedusaContainer) => c.resolve<CodModuleService>(COD_MODULE)
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`
const secret = () => {
  const s = process.env.COD_CONFIRM_SECRET
  if (!s) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "COD_CONFIRM_SECRET is not set")
  return s
}
export const confirmSecret = secret

type CodOrder = {
  id: string
  display_id: number
  total: number
  email?: string | null
  metadata?: Record<string, unknown> | null
  shipping_address?: { phone?: string | null } | null
  payment_collections?: { payment_sessions?: { provider_id: string }[] }[]
}

async function loadOrder(container: MedusaContainer, orderId: string): Promise<CodOrder | undefined> {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "order",
    fields: ["id", "display_id", "total", "email", "metadata", "shipping_address.phone", "payment_collections.payment_sessions.provider_id"],
    filters: { id: orderId },
  })
  return data[0] as unknown as CodOrder | undefined
}

async function setOrderCodStatus(container: MedusaContainer, orderId: string, status: CodStatus) {
  const order = await loadOrder(container, orderId)
  await container.resolve(Modules.ORDER).updateOrders(orderId, {
    metadata: { ...(order?.metadata ?? {}), payment_method: "cod", cod_status: status },
  })
}

const withLock = <T>(container: MedusaContainer, orderId: string, fn: () => Promise<T>) =>
  container.resolve(Modules.LOCKING).execute(`cod:${orderId}`, fn, { timeout: 30 })

export const isCodOrder = (order: CodOrder | undefined) =>
  !!order?.payment_collections?.some((pc) => pc.payment_sessions?.some((s) => s.provider_id === COD_PROVIDER_ID))

/** Called once per placed COD order: creates the pending confirmation and sends the link. */
export async function startCodConfirmation(container: MedusaContainer, orderId: string) {
  return withLock(container, orderId, async () => {
    const order = await loadOrder(container, orderId)
    if (!order || !isCodOrder(order)) return null
    const [existing] = await cod(container).listCodConfirmations({ order_id: orderId })
    if (existing) return existing // subscriber retry: never a second confirmation

    const settings = await cod(container).getSettings()
    const expiresAt = new Date(Date.now() + settings.cod_confirm_minutes * 60_000)
    const confirmation = await cod(container).createCodConfirmations({ order_id: orderId, expires_at: expiresAt })
    await setOrderCodStatus(container, orderId, "pending_confirmation")

    const base = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
    const hours = settings.cod_confirm_minutes / 60
    await container.resolve<MessagingModuleService>(MESSAGING_MODULE).send({
      to: { phone: order.shipping_address?.phone, email: order.email },
      template: "cod_confirm",
      data: {
        order_number: String(order.display_id),
        total: inr(order.total),
        link: `${base}/confirm/${createConfirmToken(secret(), orderId, expiresAt)}`,
        valid_for: hours >= 1 ? `${Math.round(hours)} hours` : `${settings.cod_confirm_minutes} minutes`,
      },
    })
    return confirmation
  })
}

export type TransitionResult = { status: "confirmed" | "cancelled"; changed: boolean; order_display_id: number }

export async function confirmCodOrder(container: MedusaContainer, orderId: string, by: "customer" | "admin"): Promise<TransitionResult> {
  return withLock(container, orderId, async () => {
    const [c] = await cod(container).listCodConfirmations({ order_id: orderId })
    const order = await loadOrder(container, orderId)
    if (!c || !order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "COD order not found")
    if (c.status === "confirmed") return { status: "confirmed", changed: false, order_display_id: order.display_id }
    if (c.status === "cancelled") return { status: "cancelled", changed: false, order_display_id: order.display_id }

    await cod(container).updateCodConfirmations({ id: c.id, status: "confirmed", confirmed_at: new Date(), confirmed_by: by })
    await setOrderCodStatus(container, orderId, "confirmed")
    await container.resolve<MessagingModuleService>(MESSAGING_MODULE).send({
      to: { phone: order.shipping_address?.phone, email: order.email },
      template: "cod_confirmed",
      data: { order_number: String(order.display_id) },
    })
    return { status: "confirmed", changed: true, order_display_id: order.display_id }
  })
}

/** Cancels the Medusa order (releases reserved stock = restock) and records why. */
export async function cancelCodOrder(container: MedusaContainer, orderId: string, reason: string): Promise<TransitionResult> {
  return withLock(container, orderId, async () => {
    const [c] = await cod(container).listCodConfirmations({ order_id: orderId })
    const order = await loadOrder(container, orderId)
    if (!c || !order) throw new MedusaError(MedusaError.Types.NOT_FOUND, "COD order not found")
    if (c.status !== "pending") return { status: c.status as "confirmed" | "cancelled", changed: false, order_display_id: order.display_id }

    await cancelOrderWorkflow(container).run({ input: { order_id: orderId } })
    await cod(container).updateCodConfirmations({ id: c.id, status: "cancelled", cancelled_at: new Date(), cancel_reason: reason })
    await setOrderCodStatus(container, orderId, "cancelled")
    await container.resolve<MessagingModuleService>(MESSAGING_MODULE).send({
      to: { phone: order.shipping_address?.phone, email: order.email },
      template: "cod_cancelled",
      data: { order_number: String(order.display_id), reason },
    })
    return { status: "cancelled", changed: true, order_display_id: order.display_id }
  })
}
