import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestOtp } from "../../../../lib/otp-auth"
import type { OtpRequestBody } from "../../../validators"

const MESSAGES: Record<string, string> = {
  too_many_for_number: "Too many codes requested for this number. Please try again in an hour.",
  too_many_from_ip: "Too many login attempts from this network. Please try again later.",
  resend_too_soon: "Please wait a few seconds before asking for a new code.",
  resend_limit: "You've reached the resend limit. Please start again in a few minutes.",
}

// POST /store/otp/request { phone | email, resend? } → sends a 6-digit code.
export async function POST(req: MedusaRequest<OtpRequestBody>, res: MedusaResponse) {
  const body = req.validatedBody as { phone?: string; email?: string; resend?: boolean }
  // Medusa sets Express "trust proxy" = 1, so behind Nginx (which sets X-Forwarded-For to the
  // client address, deploy/server/nginx) req.ip is the visitor, not 127.0.0.1.
  const r = await requestOtp(req.scope, { phone: body.phone, email: body.email }, req.ip ?? null, !!body.resend)
  if (!r.ok) return res.status(429).json({ reason: r.reason, message: MESSAGES[r.reason], retry_after_seconds: r.retryAfterMs ? Math.ceil(r.retryAfterMs / 1000) : undefined })
  res.json({ sent: true, channel: r.channel, resend_after_seconds: r.resendAfterSeconds, expires_in_seconds: r.expiresInSeconds })
}
