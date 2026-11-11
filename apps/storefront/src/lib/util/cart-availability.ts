import type { HttpTypes } from "@medusajs/types"

// Server-priced lines that are not products (e.g. the Cash on Delivery fee).
export const isServiceLine = (i: HttpTypes.StoreCartLineItem) => i.metadata?.type === "cod_fee"

// Line items whose product was deleted or unpublished after being added. Medusa
// rejects every cart update while they are in the cart, so checkout must remove them.
export const unavailableItems = (cart: HttpTypes.StoreCart) =>
  (cart.items ?? []).filter(
    (i) => !isServiceLine(i) && (!i.variant || (!!i.product?.status && i.product.status !== "published"))
  )
