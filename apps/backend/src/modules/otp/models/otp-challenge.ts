import { model } from "@medusajs/framework/utils"

// One login-code request (ARCHITECTURE.md §11). Only an HMAC of the code is
// stored; sends = first send + resends; consumed_at makes a code single-use.
const OtpChallenge = model
  .define("otp_challenge", {
    id: model.id({ prefix: "otp" }).primaryKey(),
    identifier: model.text(), // "tel:+91…" or "email:…"
    code_hash: model.text(),
    expires_at: model.dateTime(),
    attempts: model.number().default(0),
    sends: model.number().default(1),
    last_sent_at: model.dateTime(),
    consumed_at: model.dateTime().nullable(),
    ip: model.text().nullable(),
  })
  .indexes([{ on: ["identifier"] }, { on: ["ip"] }])

export default OtpChallenge
