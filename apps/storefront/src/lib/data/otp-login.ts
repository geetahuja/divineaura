"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { getCacheTag, setAuthToken } from "./cookies"
import { transferCart } from "./customer"

/**
 * Last step of OTP login (ARCHITECTURE.md §11). The browser requests and
 * verifies the code with the backend directly (so rate limits see the real IP);
 * the backend returns a 60-second signed ticket, exchanged here for the session
 * cookie through the "phone-otp" auth provider.
 */
export async function loginWithTicket(ticket: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let token: unknown
  try {
    token = await sdk.auth.login("customer", "phone-otp", { ticket })
  } catch {
    return { ok: false, error: "Login code expired. Please request a new one." }
  }
  if (typeof token !== "string") return { ok: false, error: "Login failed. Please try again." }
  await setAuthToken(token)
  revalidateTag(await getCacheTag("customers"), { expire: 0 })
  await transferCart().catch(() => {}) // a guest cart joins the account; never block login on it
  revalidateTag(await getCacheTag("carts"), { expire: 0 })
  return { ok: true }
}
