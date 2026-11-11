import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyOtp } from "../../../../lib/otp-auth"
import type { OtpVerifyBody } from "../../../validators"

const MESSAGES = {
  wrong: "That code is not right.",
  expired: "This code has expired. Please request a new one.",
  locked: "Too many wrong attempts. Please request a new code.",
  used: "This code was already used. Please request a new one.",
}

// POST /store/otp/verify { phone | email, code } → { ticket } for POST /auth/customer/phone-otp.
export async function POST(req: MedusaRequest<OtpVerifyBody>, res: MedusaResponse) {
  const body = req.validatedBody as { phone?: string; email?: string; code: string }
  const r = await verifyOtp(req.scope, { phone: body.phone, email: body.email }, body.code)
  if (!r.ok) return res.status(400).json({ reason: r.reason, attempts_left: "attemptsLeft" in r ? r.attemptsLeft : undefined, message: MESSAGES[r.reason] })
  res.json({ ticket: r.ticket })
}
