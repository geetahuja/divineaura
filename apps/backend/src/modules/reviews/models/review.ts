import { model } from "@medusajs/framework/utils"

// Verified-buyer review (ARCHITECTURE.md §5 rule 10). One per order item.
// Admins can approve / reject / hide and reply, never change the text or rating.
const Review = model
  .define("review", {
    id: model.id({ prefix: "rev" }).primaryKey(),
    product_id: model.text(),
    order_id: model.text(),
    order_number: model.number(),
    order_item_id: model.text().unique(),
    customer_id: model.text(),
    rating: model.number(),
    title: model.text().nullable(),
    body: model.text(),
    photos: model.json(), // public URLs, EXIF stripped
    display_name: model.text(), // "Priya S., Nashik" or "Verified buyer"
    status: model.enum(["pending", "approved", "rejected", "hidden"]).default("pending"),
    reject_reason: model.text().nullable(), // admin only, never public
    reply: model.text().nullable(), // public seller reply
    replied_at: model.dateTime().nullable(),
    approved_at: model.dateTime().nullable(),
    incentive_code: model.text().nullable(), // coupon given for this review (shown as a note)
    ip: model.text().nullable(),
  })
  .indexes([{ on: ["product_id", "status"] }, { on: ["customer_id"] }, { on: ["order_id"] }, { on: ["status"] }])

export default Review
