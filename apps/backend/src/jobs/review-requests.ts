import type { MedusaContainer } from "@medusajs/framework/types"
import { sendDueReviewRequests } from "../lib/reviews"

// One review-request message per order, X days after delivery (Admin → Reviews → Settings).
export default async function reviewRequests(container: MedusaContainer) {
  const sent = await sendDueReviewRequests(container)
  if (sent) container.resolve("logger").info(`review-requests: sent ${sent}`)
}

export const config = { name: "review-requests", schedule: "15 * * * *" } // hourly
