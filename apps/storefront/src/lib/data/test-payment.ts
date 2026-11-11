"use server"

import { sdk } from "@lib/config"
import { redirect, unstable_rethrow } from "next/navigation"
import { placeOrder } from "./cart"

// DEVELOPMENT ONLY: tells the backend test gateway how the "payment" went. The
// backend then sends itself a signed webhook, exactly like Razorpay would.
export async function simulateTestPayment(sessionId: string, outcome: "success" | "failure" | "cancel") {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test payments are disabled in production")
  }
  if (outcome === "cancel") {
    redirect("/checkout?step=payment&payment_error=cancelled")
  }
  await sdk.client.fetch("/store/test-payment/simulate", {
    method: "POST",
    body: { payment_session_id: sessionId, outcome },
  })
  if (outcome === "failure") {
    redirect("/checkout?step=payment&payment_error=failed")
  }
  // Same as /api/payment-return (used by redirect-based gateways): the backend
  // asks the gateway whether the payment succeeded before creating the order.
  try {
    await placeOrder() // redirects to /order/{id}/confirmed
  } catch (error) {
    unstable_rethrow(error)
  }
  redirect("/checkout?step=payment&payment_error=order_failed")
}
