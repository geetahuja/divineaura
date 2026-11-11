"use client"

import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { useState, useTransition } from "react"

// ponytail: UI cap only; Medusa rejects quantities above available stock and
// rechecks stock when the order is placed.
const MAX_QTY = 10

export default function CartLine({ item, currencyCode }: { item: HttpTypes.StoreCartLineItem; currencyCode: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null)
      try {
        await fn()
      } catch (e) {
        setError((e as Error).message)
      }
    })

  const options = item.variant?.options?.map((o) => o.value).join(" · ") || item.variant_title
  const money = (n: number) => convertToLocale({ amount: n, currency_code: currencyCode })

  return (
    <li className={`flex gap-4 border-b border-champagne py-4 ${pending ? "opacity-60" : ""}`} data-testid="product-row">
      <LocalizedClientLink href={`/products/${item.product_handle}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-champagne bg-ivory-deep small:h-24 small:w-24">
        {item.thumbnail ? (
          <Image src={item.thumbnail} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-accent" aria-hidden />
        )}
      </LocalizedClientLink>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <LocalizedClientLink href={`/products/${item.product_handle}`} className="font-semibold leading-snug text-ink hover:text-primary" data-testid="product-title">
            {item.product_title}
          </LocalizedClientLink>
          <span className="shrink-0 font-semibold text-ink">{money(Number(item.total ?? 0))}</span>
        </div>
        {options && <p className="text-sm text-ink-soft">{options}</p>}
        <p className="text-xs text-ink-muted">{money(Number(item.unit_price))} each</p>

        <div className="mt-1 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-champagne bg-white" role="group" aria-label={`Quantity of ${item.product_title}`}>
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={pending || item.quantity <= 1}
              onClick={() => run(() => updateLineItem({ lineId: item.id, quantity: item.quantity - 1 }))}
              className="flex h-9 w-9 items-center justify-center text-primary disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={pending || item.quantity >= MAX_QTY}
              onClick={() => run(() => updateLineItem({ lineId: item.id, quantity: item.quantity + 1 }))}
              className="flex h-9 w-9 items-center justify-center text-primary disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteLineItem(item.id))}
            className="flex items-center gap-1 text-sm text-ink-soft hover:text-red-700"
            data-testid="product-delete-button"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </li>
  )
}
