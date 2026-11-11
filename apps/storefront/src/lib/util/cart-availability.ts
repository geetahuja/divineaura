import type { HttpTypes } from "@medusajs/types"

// Line items whose product was deleted or unpublished after being added. Medusa
// rejects every cart update while they are in the cart, so checkout must remove them.
export const unavailableItems = (cart: HttpTypes.StoreCart) =>
  (cart.items ?? []).filter(
    (i) => !i.variant || (!!i.product?.status && i.product.status !== "published")
  )
