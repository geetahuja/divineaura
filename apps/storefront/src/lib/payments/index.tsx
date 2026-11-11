import type { HttpTypes } from "@medusajs/types"
import type { ComponentType, ReactNode } from "react"
import { cod } from "./cod"
import { testPayment } from "./test-payment"

/**
 * Pluggable payment methods (ARCHITECTURE.md §5.7, §9).
 *
 * Every payment method is a Medusa payment provider on the backend plus one
 * adapter here. Checkout only talks to this registry, so adding Razorpay or
 * Cashfree = backend provider module + `./razorpay.tsx` adapter added to
 * ADAPTERS. No checkout changes.
 *
 * kind decides server-side pricing: "online" gets the prepaid discount,
 * "cod" gets the COD fee and is only offered when the cart is eligible.
 *
 * Contract for PayButton (online): when the customer has paid at the gateway,
 * send them to `/api/payment-return?cart_id=…` (the server completes the cart
 * after the gateway confirms; the order turns Paid only via the verified
 * webhook). On failure/cancel: `/checkout?step=payment&payment_error=failed|cancelled`.
 */
export type PayButtonProps = {
  cart: HttpTypes.StoreCart
  providerId: string
  disabled: boolean
}

export type PaymentAdapter = {
  match: (providerId: string) => boolean
  kind: "online" | "cod"
  title: string
  description: string
  icon: ReactNode
  PayButton: ComponentType<PayButtonProps>
}

const ADAPTERS: PaymentAdapter[] = [testPayment, cod]

export const getPaymentAdapter = (providerId?: string | null) =>
  providerId ? ADAPTERS.find((a) => a.match(providerId)) : undefined

// Providers enabled in the region that the storefront knows how to show.
export const supportedProviders = (providers: { id: string }[]) =>
  providers.filter((p) => getPaymentAdapter(p.id))
