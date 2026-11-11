"use server"

import { sdk } from "@lib/config"

export type CodConfirmState = {
  state: "pending" | "confirmed" | "cancelled" | "expired" | "invalid"
  changed?: boolean
  order?: { display_id: number; total: number; currency_code: string; items: { title: string; quantity: number }[] }
}

// Read-only (safe for link previews).
export async function getCodConfirmState(token: string) {
  return sdk.client
    .fetch<CodConfirmState>("/store/cod/confirm", { query: { token }, cache: "no-store" })
    .catch(() => ({ state: "invalid" }) as CodConfirmState)
}

// Only a deliberate tap on "Confirm my order" confirms.
export async function confirmCodOrder(token: string, _prev: CodConfirmState | null): Promise<CodConfirmState> {
  return sdk.client
    .fetch<CodConfirmState>("/store/cod/confirm", { method: "POST", body: { token } })
    .catch(() => ({ state: "invalid" }) as CodConfirmState)
}
