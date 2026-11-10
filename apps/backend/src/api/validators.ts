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

export type CreateSacredPlaceBody = z.infer<typeof CreateSacredPlaceSchema>
export type UpdateSacredPlaceBody = z.infer<typeof UpdateSacredPlaceSchema>
export type ReorderSacredPlacesBody = z.infer<typeof ReorderSacredPlacesSchema>
