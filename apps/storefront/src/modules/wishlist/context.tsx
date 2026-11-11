"use client"

import { getAccountWishlist, updateAccountWishlist } from "@lib/data/wishlist"
import { clearLocalWishlist, mergeWishlist, readLocalWishlist, writeLocalWishlist } from "@lib/wishlist"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

type Ctx = {
  ids: string[]
  ready: boolean
  has: (id: string) => boolean
  toggle: (id: string) => void
  remove: (id: string) => void
  /** After login: merge the browser list into the account (then clear the browser copy). */
  sync: () => Promise<void>
  /** After logout: back to an empty guest list. */
  reset: () => void
}

const WishlistContext = createContext<Ctx | null>(null)

export function WishlistProvider({ loggedIn, children }: { loggedIn: boolean; children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [account, setAccount] = useState(loggedIn)

  const sync = useCallback(async () => {
    const server = await getAccountWishlist()
    if (server === null) {
      setAccount(false)
      setIds(readLocalWishlist())
    } else {
      setAccount(true)
      const local = readLocalWishlist()
      const merged = local.length ? ((await updateAccountWishlist("merge", local)) ?? mergeWishlist(server, local)) : server
      if (local.length) clearLocalWishlist()
      setIds(merged)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    // Guests: the browser list right away; logged in: the account list (merging any guest list).
    if (!loggedIn) {
      setIds(readLocalWishlist())
      setReady(true)
    } else void sync()
  }, [loggedIn, sync])

  const save = (next: string[], action: "add" | "remove", id: string) => {
    setIds(next)
    if (account) void updateAccountWishlist(action, [id])
    else writeLocalWishlist(next)
  }

  const value: Ctx = {
    ids,
    ready,
    has: (id) => ids.includes(id),
    toggle: (id) => (ids.includes(id) ? save(ids.filter((x) => x !== id), "remove", id) : save(mergeWishlist(ids, [id], true), "add", id)),
    remove: (id) => save(ids.filter((x) => x !== id), "remove", id),
    sync,
    reset: () => {
      clearLocalWishlist()
      setAccount(false)
      setIds([])
    },
  }
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const c = useContext(WishlistContext)
  if (!c) throw new Error("useWishlist needs <WishlistProvider>")
  return c
}
