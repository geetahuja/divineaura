import type { DeliveryCheck } from "@lib/data/delivery"

/** Why we can't deliver: GST composition scheme (seller's state only) or the courier. */
export const notServiceableText = (r: DeliveryCheck) =>
  r.status === "not_serviceable" && r.reason === "outside_state" && r.seller_state
    ? `Sorry, we currently deliver only within ${r.seller_state}.`
    : "Sorry, we don't deliver to this PIN code yet."
