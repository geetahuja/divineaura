import { model } from "@medusajs/framework/utils"

// Admin → Reviews → Settings. One row.
const ReviewSettings = model.define("review_settings", {
  id: model.id({ prefix: "rset" }).primaryKey(),
  request_after_days: model.number().default(5), // review-request message X days after delivery
  min_body_length: model.number().default(20),
  blocked_words: model.text().default(""),
  incentive_enabled: model.boolean().default(false),
  incentive_percent: model.number().default(10),
  incentive_requires_photo: model.boolean().default(true),
})

export default ReviewSettings
