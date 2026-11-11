import { placeOrder } from "@lib/data/cart"
import { setCartId } from "@lib/data/cookies"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

/**
 * Every payment method returns the customer here after paying at the gateway
 * (see lib/payments). Completing the cart makes the backend ask the gateway
 * whether the payment really succeeded — the browser's word is never trusted.
 * The order is created as "authorized" and turns Paid only when the gateway's
 * verified webhook is processed. Completing is idempotent: if the webhook got
 * there first, the existing order is returned.
 */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl
  const cartId = searchParams.get("cart_id")
  const back = (reason: string) => NextResponse.redirect(`${origin}/checkout?step=payment&payment_error=${reason}`)

  if (!cartId) {
    return back("order_failed")
  }
  await setCartId(cartId)

  try {
    await placeOrder(cartId) // redirects to /order/{id}/confirmed on success
  } catch (error) {
    unstable_rethrow(error)
  }
  return back("order_failed")
}
