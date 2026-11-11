// Wishlist helpers shared by the browser and tests. Guests keep the list in
// localStorage; logged-in customers keep it in their account (merged on login).
export const WISHLIST_KEY = "da_wishlist"
export const WISHLIST_MAX = 100

/** Account list first (or the new ids first when `newFirst`), no duplicates, capped. Same rule as the backend. */
export function mergeWishlist(account: string[], incoming: string[], newFirst = false) {
  const order = newFirst ? [...incoming, ...account] : [...account, ...incoming]
  return Array.from(new Set(order)).slice(0, WISHLIST_MAX)
}

export function readLocalWishlist(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.startsWith("prod_")) : []
  } catch {
    return []
  }
}

export function writeLocalWishlist(ids: string[]) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids.slice(0, WISHLIST_MAX)))
  } catch {
    // private mode / storage full: the list just isn't remembered
  }
}

export function clearLocalWishlist() {
  try {
    localStorage.removeItem(WISHLIST_KEY)
  } catch {}
}
