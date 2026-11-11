import { model } from "@medusajs/framework/utils"

// "Delete my data" requests (DPDP Act) — handled by a person in Admin → Privacy requests.
const PrivacyRequest = model
  .define("privacy_request", {
    id: model.id({ prefix: "prq" }).primaryKey(),
    kind: model.enum(["delete_data", "access_data", "correct_data"]).default("delete_data"),
    name: model.text(),
    email: model.text().nullable(),
    phone: model.text().nullable(),
    details: model.text().nullable(),
    status: model.enum(["open", "done", "rejected"]).default("open"),
    admin_note: model.text().nullable(),
    ip: model.text().nullable(),
    closed_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["status"] }])

export default PrivacyRequest
