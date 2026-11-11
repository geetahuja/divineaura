"use server"

import { sdk } from "@lib/config"
import { CatalogueProduct, listCatalogue } from "./catalogue"
import { getAuthHeaders } from "./cookies"

/** The account's wishlist, or null when nobody is logged in. */
export async function getAccountWishlist(): Promise<string[] | null> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) return null
  return sdk.client
    .fetch<{ product_ids: string[] }>("/store/customers/me/wishlist", { headers, cache: "no-store" })
    .then((r) => r.product_ids)
    .catch(() => null)
}

export async function updateAccountWishlist(action: "add" | "remove" | "merge", productIds: string[]): Promise<string[] | null> {
  return sdk.client
    .fetch<{ product_ids: string[] }>("/store/customers/me/wishlist", { method: "POST", headers: await getAuthHeaders(), body: { action, product_ids: productIds } })
    .then((r) => r.product_ids)
    .catch(() => null)
}

/** Wishlist cards, in wishlist order; products no longer on sale are dropped. */
export async function getWishlistProducts(ids: string[]): Promise<CatalogueProduct[]> {
  if (!ids.length) return []
  const byId = new Map((await listCatalogue()).map((p) => [p.id, p]))
  return ids.map((id) => byId.get(id)).filter((p): p is CatalogueProduct => !!p)
}
