import type { AnalyticsItem } from "@lib/analytics"
import { productLines } from "./cart-availability"

type Line = {
  variant_id?: string | null
  product_id?: string | null
  product_title?: string | null
  title?: string | null
  variant_title?: string | null
  unit_price?: number | null
  quantity?: number | null
  metadata?: Record<string, unknown> | null
}

// Cart / order lines → analytics items (products only; the COD fee isn't an item).
export const itemsFromLines = (lines?: Line[] | null): AnalyticsItem[] =>
  productLines(lines).map((l) => ({
    item_id: l.variant_id ?? l.product_id ?? "unknown",
    item_name: l.product_title ?? l.title ?? "",
    ...(l.variant_title && l.variant_title !== "Default variant" ? { item_variant: l.variant_title } : {}),
    price: Number(l.unit_price ?? 0),
    quantity: Number(l.quantity ?? 1),
  }))
