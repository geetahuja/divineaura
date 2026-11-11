import {
  allowFields,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  AddBlockedPincodesSchema,
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
