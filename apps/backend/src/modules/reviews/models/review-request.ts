import { model } from "@medusajs/framework/utils"

// The one review-request message per order (no reminders).
const ReviewRequest = model.define("review_request", {
  id: model.id({ prefix: "rreq" }).primaryKey(),
  order_id: model.text().unique(),
  sent_at: model.dateTime(),
})

export default ReviewRequest
