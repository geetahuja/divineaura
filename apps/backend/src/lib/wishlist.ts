// Wishlist merge (guest list → account on login). Pure; mirrored in the storefront.
export const WISHLIST_MAX = 100

/** Account list first (or the new ids first when `newFirst`), no duplicates, capped. */
export function mergeWishlist(account: string[], incoming: string[], newFirst = false) {
  const order = newFirst ? [...incoming, ...account] : [...account, ...incoming]
  return [...new Set(order)].slice(0, WISHLIST_MAX)
}
