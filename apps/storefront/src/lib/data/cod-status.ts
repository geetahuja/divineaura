"use server"

import { sdk } from "@lib/config"

export type OrderCodStatus = {
  status: "pending" | "confirmed" | "cancelled"
  expires_at: string
  confirmed_by: "customer" | "admin" | null
} | null

// null = not a Cash on Delivery order.
export async function getOrderCodStatus(orderId: string): Promise<OrderCodStatus> {
  return sdk.client
    .fetch<{ cod: OrderCodStatus }>(`/store/orders/${orderId}/cod-status`, { cache: "no-store" })
    .then((r) => r.cod)
    .catch(() => null)
}
