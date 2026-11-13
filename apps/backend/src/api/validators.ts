import { z } from "@medusajs/framework/zod"
import { STONE_ORIGINS } from "../modules/product-specs/models/product-specs"

const text = z.string().trim().max(2000).nullish().transform((v) => v || null)
const num = z.number().nonnegative().nullish()
const int = z.number().int().nonnegative().nullish()

const ProductSpecsFields = z.object({
    material: text,
    stone_type: text,
    stone_origin: z.enum(STONE_ORIGINS).nullish(),
    bead_size_mm: num,
    bead_count: int,
    length_cm: num,
    dimensions_mm: text,
    weight_g: num,
    chain_included: z.boolean().nullish(),
    not_returnable: z.boolean().nullish(),
    colour: text,
    pack_quantity: int,
    care_instructions: text,
    mantra: text,
    certificate_url: text,
    country_of_origin: text,
    hsn_code: z
      .string()
      .trim()
      .regex(/^(\d{4}|\d{6}|\d{8})$/, "HSN code must be 4, 6 or 8 digits")
      .nullish()
      .or(z.literal("").transform(() => null)),
})

// Gemstone descriptions must be truthful (CLAUDE.md): a stone needs its origin.
const stoneNeedsOrigin = (s: { stone_type?: string | null; stone_origin?: string | null }) =>
  !s.stone_type || !!s.stone_origin
const stoneNeedsOriginError = {
  message: "Stone origin is required when a stone type is set",
  path: ["stone_origin"],
}

export const ProductSpecsSchema = ProductSpecsFields.refine(stoneNeedsOrigin, stoneNeedsOriginError)
export type ProductSpecsBody = z.infer<typeof ProductSpecsSchema>

// Admin panel save: specs plus the product's GST rate. gst_rate null = use the
// India default (or product-type override); a number = product-level override.
export const AdminProductSpecsSchema = ProductSpecsFields.extend({
  gst_rate: z.number().min(0).max(40).nullish(),
}).refine(stoneNeedsOrigin, stoneNeedsOriginError)
export type AdminProductSpecsBody = z.infer<typeof AdminProductSpecsSchema>

const SacredPlaceFields = {
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(600),
  image_url: z.string().url().nullish(),
  image_credit: text,
  deity_tag: z.string().trim().startsWith("deity:").nullish().or(z.literal("").transform(() => null)),
  collection_id: text,
  strip_label: z.string().trim().max(40).nullish().transform((v) => v || null),
  rank: z.number().int().optional(),
  visible: z.boolean().optional(),
}

export const CreateSacredPlaceSchema = z.object(SacredPlaceFields)
export const UpdateSacredPlaceSchema = z.object(SacredPlaceFields).partial()
export const ReorderSacredPlacesSchema = z.object({ ids: z.array(z.string()).min(1) })

// Hero banners. Links are site paths ("/collections/diwali"), never full URLs,
// so the domain stays out of content (ARCHITECTURE.md §0).
const sitePath = z.string().trim().regex(/^\/(?!\/)[^\s]*$/, "Use a site path starting with /, e.g. /collections/diwali")
const dateTime = z.coerce.date().nullish()
const HeroBannerFields = z.object({
  title: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(120),
  subheading: text,
  button_text: z.string().trim().min(1).max(40),
  button_link: sitePath,
  image_desktop_url: z.string().url().nullish(),
  image_mobile_url: z.string().url().nullish(),
  image_alt: text,
  starts_at: dateTime,
  ends_at: dateTime,
  priority: z.number().int().optional(),
  active: z.boolean().optional(),
})
const endsAfterStart = (b: { starts_at?: Date | null; ends_at?: Date | null }) =>
  !b.starts_at || !b.ends_at || b.ends_at > b.starts_at
const endsAfterStartError = { message: "End date must be after the start date", path: ["ends_at"] }

export const CreateHeroBannerSchema = HeroBannerFields.refine(endsAfterStart, endsAfterStartError)
export const UpdateHeroBannerSchema = HeroBannerFields.partial().refine(endsAfterStart, endsAfterStartError)
export type CreateHeroBannerBody = z.infer<typeof CreateHeroBannerSchema>
export type UpdateHeroBannerBody = z.infer<typeof UpdateHeroBannerSchema>

export const SimulateTestPaymentSchema = z.object({
  payment_session_id: z.string().startsWith("payses_"),
  outcome: z.enum(["success", "failure"]),
})
export type SimulateTestPaymentBody = z.infer<typeof SimulateTestPaymentSchema>

// COD & payment choice (milestone 7)
export const PaymentMethodSchema = z.object({ method: z.enum(["cod", "online"]) })
export const CodConfirmSchema = z.object({ token: z.string().min(10).max(500) })
export const UpdatePaymentSettingsSchema = z
  .object({
    cod_enabled: z.boolean(),
    cod_fee: z.number().int().min(0).max(500),
    cod_max_order_value: z.number().int().min(1),
    prepaid_discount_percent: z.number().min(0).max(50),
    cod_confirm_minutes: z.number().int().min(1).max(60 * 24 * 7),
    cod_fee_tax_mode: z.enum(["goods", "fixed"]),
    cod_fee_tax_rate: z.number().min(0).max(28),
  })
  .partial()
export const AddBlockedPincodesSchema = z.object({ pincodes: z.string().max(100_000) })
export const CodCancelSchema = z.object({ reason: z.string().trim().max(200).optional() })
export type PaymentMethodBody = z.infer<typeof PaymentMethodSchema>
export type CodConfirmBody = z.infer<typeof CodConfirmSchema>
export type UpdatePaymentSettingsBody = z.infer<typeof UpdatePaymentSettingsSchema>
export type AddBlockedPincodesBody = z.infer<typeof AddBlockedPincodesSchema>
export type CodCancelBody = z.infer<typeof CodCancelSchema>

// Shipping (milestone 8)
export const TrackOrderSchema = z.object({ order_number: z.coerce.number().int().positive(), phone: z.string().trim().min(10).max(15) })
export const CreateShipmentSchema = z.object({
  courier_id: z.string().max(50).nullish(),
  provider: z.enum(["shiprocket", "manual", "test"]).nullish(),
  manual: z.object({ courier_name: z.string().trim().max(80).nullish(), awb: z.string().trim().min(3).max(40), tracking_url: z.string().trim().max(500).nullish() }).transform((m) => ({ courierName: m.courier_name ?? null, awb: m.awb, trackingUrl: m.tracking_url ?? null })).nullish(),
})
export const ManualStatusSchema = z.object({ status: z.enum(["shipped", "out_for_delivery", "delivered", "rto"]), tracking_url: z.string().trim().max(500).nullish() })
export type ManualStatusBody = z.infer<typeof ManualStatusSchema>
export const CourierSettingsSchema = z.object({
  default_courier: z.enum(["auto", "shiprocket", "manual", "test"]).optional(),
  manual_courier_name: z.string().trim().max(80).nullish(),
  manual_tracking_url: z.string().trim().max(500).refine((v) => !v || /^https:\/\//.test(v), "Must start with https://").nullish(),
  manual_eta_min: z.number().int().min(1).max(30).optional(),
  manual_eta_max: z.number().int().min(1).max(30).optional(),
})
export type CourierSettingsBody = z.infer<typeof CourierSettingsSchema>
// Bulk paste: any separators; COD list must be a subset of the serviceable list.
export const ManualPincodesSchema = z.object({ serviceable: z.string().max(400_000), cod: z.string().max(400_000) })
export type ManualPincodesBody = z.infer<typeof ManualPincodesSchema>
export const SimulateTrackingSchema = z.object({ status: z.enum(["shipped", "out_for_delivery", "delivered", "rto"]).optional() })
export type TrackOrderBody = z.infer<typeof TrackOrderSchema>
export type CreateShipmentBody = z.infer<typeof CreateShipmentSchema>
export type SimulateTrackingBody = z.infer<typeof SimulateTrackingSchema>

export type CreateSacredPlaceBody = z.infer<typeof CreateSacredPlaceSchema>
export type UpdateSacredPlaceBody = z.infer<typeof UpdateSacredPlaceSchema>
export type ReorderSacredPlacesBody = z.infer<typeof ReorderSacredPlacesSchema>

// ── Login (OTP) + newsletter + consent (Milestone 9) ─────────────────────
// Indian mobile → "+91XXXXXXXXXX" (accepts 10 digits, 0-prefixed, 91-prefixed, spaces).
const indianMobile = z
  .string()
  .transform((v) => v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform((v) => `+91${v}`)
const OtpTarget = z.union([z.object({ phone: indianMobile }), z.object({ email: z.string().trim().toLowerCase().email().max(254) })])
export const OtpRequestSchema = z.intersection(OtpTarget, z.object({ resend: z.boolean().optional() }))
export const OtpVerifySchema = z.intersection(OtpTarget, z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") }))
export const NewsletterSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), consent: z.literal(true) })
export const MarketingConsentSchema = z.object({ sms: z.boolean().optional(), whatsapp: z.boolean().optional(), email: z.boolean().optional() })
export type OtpRequestBody = z.infer<typeof OtpRequestSchema>
export type OtpVerifyBody = z.infer<typeof OtpVerifySchema>
export type NewsletterBody = z.infer<typeof NewsletterSchema>
export type MarketingConsentBody = z.infer<typeof MarketingConsentSchema>

// ── Accounts, documents, returns (Milestone 10) ─────────────────────────
const upi = z.string().trim().regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID, e.g. name@okicici")
export const ReturnRequestSchema = z.object({
  items: z.array(z.object({ item_id: z.string(), quantity: z.number().int().positive() })).min(1).max(50),
  reason: z.enum(["damaged", "wrong_item", "not_as_described", "quality", "changed_mind", "other"]),
  details: z.string().trim().max(1000).nullish(),
  photos: z.array(z.string().max(4_200_000)).max(3).optional(),
  payout: z
    .discriminatedUnion("method", [
      z.object({ method: z.literal("upi"), upi_id: upi }),
      z.object({
        method: z.literal("bank"),
        account_name: z.string().trim().min(2).max(100),
        account_number: z.string().trim().regex(/^\d{9,18}$/, "Account number must be 9–18 digits"),
        ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
      }),
    ])
    .nullish(),
})
export const WishlistSchema = z.object({
  action: z.enum(["add", "remove", "merge"]),
  product_ids: z.array(z.string().regex(/^prod_[A-Za-z0-9]+$/)).max(100),
})
export const AdminReturnNoteSchema = z.object({ note: z.string().trim().max(500).nullish() })
export const AdminReturnRejectSchema = z.object({ note: z.string().trim().min(3, "Tell the customer why").max(500) })
export const AdminRefundPaidSchema = z.object({ reference: z.string().trim().max(100).nullish() })
const optionalUrl = z.string().trim().url().max(300).nullish().or(z.literal("").transform(() => null))
const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2027-08-02")
  .nullish()
  .or(z.literal("").transform(() => null))
export const BusinessSettingsSchema = z.object({
  legal_name: z.string().trim().min(2).max(120),
  brand_name: z.string().trim().min(2).max(60),
  brand_name_hi: z.string().trim().min(1).max(60),
  tagline_en: z.string().trim().max(120),
  tagline_hi: z.string().trim().max(120),
  social_instagram: optionalUrl,
  social_facebook: optionalUrl,
  social_youtube: optionalUrl,
  social_pinterest: optionalUrl,
  next_snan_label: z.string().trim().max(80).nullish().transform((v) => v || null),
  next_snan_date: optionalDate,
  goda_jal_dispatch_date: optionalDate,
  goda_jal_packer: z.string().trim().max(1000).nullish().transform((v) => v || null),
  address: z.string().trim().max(500),
  state: z.string().trim().min(2).max(60),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN must be 15 characters, e.g. 27ABCDE1234F1Z5")
    .nullish()
    .or(z.literal("").transform(() => null)),
  email: z.string().trim().email().nullish().or(z.literal("").transform(() => null)),
  phone: z.string().trim().max(20).nullish(),
  invoice_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,4}$/, "1–4 letters or digits"),
  credit_note_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,4}$/, "1–4 letters or digits"),
  gst_scheme: z.enum(["regular", "composition"]).default("regular"),
  bill_of_supply_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,4}$/, "1–4 letters or digits").default("BOS"),
  return_window_days: z.number().int().min(0).max(60),
  grievance_name: z.string().trim().max(100).nullish().transform((v) => v || null),
  grievance_email: z.string().trim().email().nullish().or(z.literal("").transform(() => null)),
  grievance_phone: z.string().trim().max(20).nullish().transform((v) => v || null),
  grievance_ack_hours: z.number().int().min(1).max(168).default(48),
  grievance_resolve_days: z.number().int().min(1).max(60).default(30),
})
export type ReturnRequestBody = z.infer<typeof ReturnRequestSchema>
export type WishlistBody = z.infer<typeof WishlistSchema>
export type BusinessSettingsBody = z.infer<typeof BusinessSettingsSchema>

// ── Reviews (Milestone 11) ──────────────────────────────────────────────
const reviewFields = {
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).nullish(),
  body: z.string().trim().min(1).max(3000),
  photos: z.array(z.string().max(2_800_000)).max(4).optional(), // data URLs, ≤ 2 MB each after decoding
  keep_photos: z.array(z.string().url()).max(4).optional(),
  show_name: z.boolean().default(true),
}
export const CreateReviewSchema = z.object({ order_id: z.string(), item_id: z.string(), ...reviewFields })
export const UpdateReviewSchema = z.object(reviewFields)
export const ModerateReviewSchema = z.object({ reason: z.string().trim().max(500).nullish() })
export const ReplyReviewSchema = z.object({ reply: z.string().trim().max(1500).nullish() })
export const ReviewSettingsSchema = z.object({
  request_after_days: z.number().int().min(1).max(60),
  min_body_length: z.number().int().min(0).max(500),
  blocked_words: z.string().max(5000),
  incentive_enabled: z.boolean(),
  incentive_percent: z.number().int().min(1).max(50),
  incentive_requires_photo: z.boolean(),
})
export type CreateReviewBody = z.infer<typeof CreateReviewSchema>
export type UpdateReviewBody = z.infer<typeof UpdateReviewSchema>
export type ReviewSettingsBody = z.infer<typeof ReviewSettingsSchema>

// ── Content, contact, privacy (Milestone 12) ────────────────────────────
const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null)
export const ContactSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254).nullish().or(z.literal("").transform(() => null)),
    phone: optText(20),
    order_number: optText(20),
    topic: z.enum(["order", "product", "return", "other"]).default("other"),
    message: z.string().trim().min(10).max(2000),
    website: z.string().max(0).optional(), // honeypot: must stay empty
  })
  .refine((b) => b.email || b.phone, "Give an email or a phone number so we can reply")
export const PrivacyRequestSchema = z
  .object({
    kind: z.enum(["delete_data", "access_data", "correct_data"]),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254).nullish().or(z.literal("").transform(() => null)),
    phone: optText(20),
    details: optText(1000),
    website: z.string().max(0).optional(),
  })
  .refine((b) => b.email || b.phone, "Give the email or mobile number used with your orders")
export const UpdatePageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().max(50000),
  faq: z.array(z.object({ q: z.string().trim().min(3).max(300), a: z.string().trim().min(1).max(3000) })).max(100).nullish(),
  seo_title: optText(70),
  seo_description: optText(170),
  published: z.boolean(),
})
export const PreviewPageSchema = z.object({ body: z.string().max(50000) })
export const UpdatePrivacyRequestSchema = z.object({ status: z.enum(["open", "done", "rejected"]), admin_note: optText(1000) })
export type ContactBody = z.infer<typeof ContactSchema>
export type PrivacyRequestBody = z.infer<typeof PrivacyRequestSchema>
export type UpdatePageBody = z.infer<typeof UpdatePageSchema>
export const UndeliveredRefundSchema = z.object({ cause: z.enum(["courier_failed", "customer_refused", "wrong_address"]) })
