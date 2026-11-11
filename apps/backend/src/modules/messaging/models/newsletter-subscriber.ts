import { model } from "@medusajs/framework/utils"

// Footer newsletter (marketing email). Stored only with explicit consent.
const NewsletterSubscriber = model.define("newsletter_subscriber", {
  id: model.id({ prefix: "nls" }).primaryKey(),
  email: model.text().unique(),
  consent_text: model.text(),
  consented_at: model.dateTime(),
  unsubscribed_at: model.dateTime().nullable(),
  source: model.text().default("footer"),
})

export default NewsletterSubscriber
