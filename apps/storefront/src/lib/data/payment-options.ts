"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

export type PaymentOptions = {
  cod: { available: boolean; reason: "disabled" | "over_limit" | "pincode_blocked" | "no_address" | "courier_no_cod" | null; fee: number; max_order_value: number }
  prepaid: { percent: number; saving: number }
  selected: "cod" | "online" | null
}

export type PublicPaymentSettings = {
  cod_enabled: boolean
  cod_fee: number
  cod_max_order_value: number
  prepaid_discount_percent: number
}

// Per-cart, computed on the server (COD eligibility, fee, prepaid saving). Never cached.
export async function getPaymentOptions(cartId: string) {
  return sdk.client
    .fetch<PaymentOptions>(`/store/carts/${cartId}/payment-options`, { headers: await getAuthHeaders(), cache: "no-store" })
    .catch(() => null)
}

// Prices the cart for COD (adds the fee) or online (applies the prepaid discount).
export async function selectPaymentMethod(cartId: string, method: "cod" | "online") {
  await sdk.client.fetch(`/store/carts/${cartId}/payment-method`, {
    method: "POST",
    body: { method },
    headers: await getAuthHeaders(),
  })
  revalidateTag(await getCacheTag("carts"), { expire: 0 })
}

// For badges like "COD available" (admin changes show within a minute).
export async function getPublicPaymentSettings() {
  return sdk.client
    .fetch<PublicPaymentSettings>("/store/payment-settings", { next: { revalidate: 60 }, cache: "force-cache" })
    .catch(() => null)
}
