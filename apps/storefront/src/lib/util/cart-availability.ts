import type { HttpTypes } from "@medusajs/types"

// Server-priced lines that are not products (the Cash on Delivery fee). They are
// never listed as items or counted — totals show them as a fee line instead.
type Line = { metadata?: Record<string, unknown> | null; quantity?: number | null; total?: number | null; unit_price?: number | null }
export const isServiceLine = (i: Line) => i.metadata?.type === "cod_fee"
export const productLines = <T extends Line>(items?: T[] | null) => (items ?? []).filter((i) => !isServiceLine(i))
export const countProducts = (items?: Line[] | null) => productLines(items).reduce((n, i) => n + Number(i.quantity ?? 0), 0)
export const codFeeTotal = (items?: Line[] | null) =>
  (items ?? []).filter(isServiceLine).reduce((n, i) => n + Number(i.total ?? i.unit_price ?? 0), 0)

// Line items whose product was deleted or unpublished after being added. Medusa
// rejects every cart update while they are in the cart, so checkout must remove them.
export const unavailableItems = (cart: HttpTypes.StoreCart) =>
  (cart.items ?? []).filter(
    (i) => !isServiceLine(i) && (!i.variant || (!!i.product?.status && i.product.status !== "published"))
  )
