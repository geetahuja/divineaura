"use server"

import { sdk } from "@lib/config"
import { refresh } from "next/cache"
import { getAuthHeaders } from "./cookies"

export type ReturnLine = { id: string; title: string; quantity: number; returnable: boolean; available: number; unit_refund: number }
export type ReturnRequestSummary = {
  id: string
  status: "requested" | "approved" | "rejected" | "received" | "refunded"
  items: { item_id: string; title?: string; quantity: number; amount: number }[]
  reason: string
  refund_amount: number
  refund_method: "original" | "manual"
  payout_hint: string | null
  pickup_awb: string | null
  admin_note: string | null
  created_at: string
}
export type OrderActions = {
  payment_method: "cod" | "online"
  cod_status: string | null
  invoice: { number: string; url: string } | null
  credit_notes: { number: string; amount: number; url: string }[]
  cancel: { allowed: boolean; reason?: string }
  returns: {
    open: boolean
    reason: string | null
    closes_at: string | null
    window_days: number
    refund_method: "original" | "manual"
    lines: ReturnLine[]
    requests: ReturnRequestSummary[]
  }
}

const errorMessage = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? ""
  return m && !/^\d{3}$/.test(m) ? m : "Something went wrong. Please try again."
}

export async function getOrderActions(orderId: string): Promise<OrderActions | null> {
  return sdk.client
    .fetch<OrderActions>(`/store/customers/me/orders/${orderId}/actions`, { headers: await getAuthHeaders(), cache: "no-store" })
    .catch(() => null)
}

// Order pages fetch with no-store; this re-renders the current page with the new state.
async function refreshOrders() {
  refresh()
}

export async function cancelMyOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sdk.client.fetch(`/store/customers/me/orders/${orderId}/cancel`, { method: "POST", headers: await getAuthHeaders() })
    await refreshOrders()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export type ReturnPayload = {
  items: { item_id: string; quantity: number }[]
  reason: string
  details?: string
  photos?: string[] // data URLs (resized in the browser)
  payout?: { method: "upi"; upi_id: string } | { method: "bank"; account_name: string; account_number: string; ifsc: string } | null
}

export async function requestReturn(orderId: string, payload: ReturnPayload): Promise<{ ok: true; refund: number } | { ok: false; error: string }> {
  try {
    const r = await sdk.client.fetch<{ return: { refund_amount: number } }>(`/store/customers/me/orders/${orderId}/returns`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: payload,
    })
    await refreshOrders()
    return { ok: true, refund: r.return.refund_amount }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
