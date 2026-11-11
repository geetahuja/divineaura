import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import type { AuthenticationInput, AuthenticationResponse, AuthIdentityProviderService } from "@medusajs/framework/types"
import { readTicket } from "../../lib/otp"

type Options = { secret: string }

/**
 * Medusa auth provider "phone-otp" (ARCHITECTURE.md §11). The code itself is
 * checked by POST /store/otp/verify (limits, expiry, hashing live there); that
 * route returns a 60-second signed ticket, which this provider exchanges for a
 * normal Medusa customer session: POST /auth/customer/phone-otp { ticket }.
 * Identities are "tel:+91…" (mobile) or "email:…" (email fallback).
 */
class PhoneOtpAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "phone-otp"
  static DISPLAY_NAME = "Mobile / email OTP"
  private secret: string

  static validateOptions(options: Record<string, unknown>) {
    if (!options?.secret) throw new MedusaError(MedusaError.Types.INVALID_DATA, "phone-otp: secret (OTP_SECRET) is required")
  }

  constructor(container: Record<string, unknown>, options: Options) {
    // @ts-expect-error base constructor typing
    super(...arguments)
    this.secret = options.secret
  }

  async authenticate(data: AuthenticationInput, identities: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    const entityId = readTicket(this.secret, String((data.body as { ticket?: string } | undefined)?.ticket ?? ""))
    if (!entityId) return { success: false, error: "Login code expired. Please request a new one." }
    try {
      return { success: true, authIdentity: await identities.retrieve({ entity_id: entityId }) }
    } catch {
      return { success: true, authIdentity: await identities.create({ entity_id: entityId }) }
    }
  }

  async register(): Promise<AuthenticationResponse> {
    // Accounts are created automatically on the first verified login.
    return { success: false, error: "Use /store/otp/request and /store/otp/verify to sign in." }
  }
}

export default PhoneOtpAuthProvider
