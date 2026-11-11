import {
  allowFields,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  AddBlockedPincodesSchema,
  CreateShipmentSchema,
  SimulateTrackingSchema,
  TrackOrderSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  NewsletterSchema,
  MarketingConsentSchema,
  ReturnRequestSchema,
  WishlistSchema,
  AdminReturnNoteSchema,
  AdminReturnRejectSchema,
  AdminRefundPaidSchema,
  BusinessSettingsSchema,
  CreateReviewSchema,
  UpdateReviewSchema,
  ModerateReviewSchema,
  ReplyReviewSchema,
  ReviewSettingsSchema,
  AdminProductSpecsSchema,
  CodCancelSchema,
  CodConfirmSchema,
  PaymentMethodSchema,
  UpdatePaymentSettingsSchema,
  CreateHeroBannerSchema,
  CreateSacredPlaceSchema,
  SimulateTestPaymentSchema,
  UpdateHeroBannerSchema,
  ReorderSacredPlacesSchema,
  UpdateSacredPlaceSchema,
} from "./validators"

const SPEC_FIELDS = [
  "id",
  "material",
  "stone_type",
  "stone_origin",
  "bead_size_mm",
  "bead_count",
  "length_cm",
  "dimensions_mm",
  "weight_g",
  "chain_included",
  "colour",
  "pack_quantity",
  "care_instructions",
  "mantra",
  "certificate_url",
  "country_of_origin",
  "hsn_code",
  "not_returnable",
]

export default defineMiddlewares({
  routes: [
    // The product index declares filterable `status` and `sales_channel_ids`, so
    // the route narrows it to published products in the key's sales channels.
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    // Lets the storefront request product_specs.<field> on products (list fields
    // explicitly; the product_specs.* wildcard is not allowed on this route).
    {
      matcher: "/store/products*",
      middlewares: [allowFields(...SPEC_FIELDS.map((f) => `product_specs.${f}`))],
    },
    {
      method: ["POST"],
      matcher: "/admin/products/:id/specs",
      middlewares: [validateAndTransformBody(AdminProductSpecsSchema)],
    },
    // Courier webhooks are verified against the exact raw body.
    { method: ["POST"], matcher: "/hooks/shipping/*", bodyParser: { preserveRawBody: true } },
    { method: ["POST"], matcher: "/store/otp/request", middlewares: [validateAndTransformBody(OtpRequestSchema)] },
    { method: ["POST"], matcher: "/store/otp/verify", middlewares: [validateAndTransformBody(OtpVerifySchema)] },
    { method: ["POST"], matcher: "/store/newsletter", middlewares: [validateAndTransformBody(NewsletterSchema)] },
    { method: ["POST"], matcher: "/store/customers/me/marketing-consent", middlewares: [validateAndTransformBody(MarketingConsentSchema)] },
    {
      method: ["POST"],
      matcher: "/store/customers/me/orders/:id/returns",
      bodyParser: { sizeLimit: "14mb" }, // up to 3 photos, resized in the browser
      middlewares: [validateAndTransformBody(ReturnRequestSchema)],
    },
    { method: ["POST"], matcher: "/store/customers/me/wishlist", middlewares: [validateAndTransformBody(WishlistSchema)] },
    { method: ["POST"], matcher: "/admin/returns/:id/approve", middlewares: [validateAndTransformBody(AdminReturnNoteSchema)] },
    { method: ["POST"], matcher: "/admin/returns/:id/reject", middlewares: [validateAndTransformBody(AdminReturnRejectSchema)] },
    { method: ["POST"], matcher: "/admin/returns/:id/refund", middlewares: [validateAndTransformBody(AdminRefundPaidSchema)] },
    { method: ["POST"], matcher: "/admin/business-settings", middlewares: [validateAndTransformBody(BusinessSettingsSchema)] },
    { method: ["POST"], matcher: "/store/customers/me/reviews", bodyParser: { sizeLimit: "12mb" }, middlewares: [validateAndTransformBody(CreateReviewSchema)] },
    { method: ["POST"], matcher: "/store/customers/me/reviews/:id", bodyParser: { sizeLimit: "12mb" }, middlewares: [validateAndTransformBody(UpdateReviewSchema)] },
    { method: ["POST"], matcher: "/admin/reviews/:id/approve", middlewares: [validateAndTransformBody(ModerateReviewSchema)] },
    { method: ["POST"], matcher: "/admin/reviews/:id/reject", middlewares: [validateAndTransformBody(ModerateReviewSchema)] },
    { method: ["POST"], matcher: "/admin/reviews/:id/hide", middlewares: [validateAndTransformBody(ModerateReviewSchema)] },
    { method: ["POST"], matcher: "/admin/reviews/:id/reply", middlewares: [validateAndTransformBody(ReplyReviewSchema)] },
    { method: ["POST"], matcher: "/admin/review-settings", middlewares: [validateAndTransformBody(ReviewSettingsSchema)] },
    { method: ["POST"], matcher: "/store/track", middlewares: [validateAndTransformBody(TrackOrderSchema)] },
    { method: ["POST"], matcher: "/admin/shipping/orders/:id/shipment", middlewares: [validateAndTransformBody(CreateShipmentSchema)] },
    { method: ["POST"], matcher: "/admin/shipping/orders/:id/simulate", middlewares: [validateAndTransformBody(SimulateTrackingSchema)] },
    { method: ["POST"], matcher: "/store/carts/:id/payment-method", middlewares: [validateAndTransformBody(PaymentMethodSchema)] },
    { method: ["POST"], matcher: "/store/cod/confirm", middlewares: [validateAndTransformBody(CodConfirmSchema)] },
    { method: ["POST"], matcher: "/admin/payment-settings", middlewares: [validateAndTransformBody(UpdatePaymentSettingsSchema)] },
    { method: ["POST"], matcher: "/admin/cod/blocklist", middlewares: [validateAndTransformBody(AddBlockedPincodesSchema)] },
    { method: ["POST"], matcher: "/admin/cod/orders/:id/cancel", middlewares: [validateAndTransformBody(CodCancelSchema)] },
    {
      method: ["POST"],
      matcher: "/store/test-payment/simulate",
      middlewares: [validateAndTransformBody(SimulateTestPaymentSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/hero-banners",
      middlewares: [validateAndTransformBody(CreateHeroBannerSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/hero-banners/:id",
      middlewares: [validateAndTransformBody(UpdateHeroBannerSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/sacred-places",
      middlewares: [validateAndTransformBody(CreateSacredPlaceSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/sacred-places/reorder",
      middlewares: [validateAndTransformBody(ReorderSacredPlacesSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/sacred-places/:id",
      middlewares: [validateAndTransformBody(UpdateSacredPlaceSchema)],
    },
  ],
})
