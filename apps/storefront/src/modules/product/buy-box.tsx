"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { isVariantInStock } from "@lib/util/inventory"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Minus, Plus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import SizeGuide from "./size-guide"

type Variant = HttpTypes.StoreProductVariant
const inr = (n: number) => convertToLocale({ amount: n, currency_code: "inr" })
const MAX_QTY = 10

const keymap = (v?: Variant) =>
  Object.fromEntries((v?.options ?? []).map((o) => [o.option_id!, o.value])) as Record<string, string>

const priceOf = (v?: Variant) => {
  const price = v?.calculated_price?.calculated_amount ?? null
  const mrpRaw = Number(v?.metadata?.mrp) || v?.calculated_price?.original_amount || null
  const mrp = price != null && mrpRaw != null && mrpRaw > price ? mrpRaw : null
  return { price, mrp, discount: mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0 }
}

// Natural order for option values: sizes XS→XXL, numbers ascending ("Pack of 3"),
// otherwise the admin's variant order.
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
const valueOrder = (values: { value: string }[], variants: Variant[], optionId: string) => {
  const all = values.map((v) => v.value.trim().toUpperCase())
  if (all.every((v) => SIZES.includes(v))) {
    return (a: string, b: string) => SIZES.indexOf(a.trim().toUpperCase()) - SIZES.indexOf(b.trim().toUpperCase())
  }
  const num = (v: string) => Number(v.match(/\d+(\.\d+)?/)?.[0])
  if (values.every((v) => !Number.isNaN(num(v.value)))) {
    return (a: string, b: string) => num(a) - num(b)
  }
  const rank = (value: string) => {
    const i = variants.findIndex((v) => keymap(v)[optionId] === value)
    return i < 0 ? Infinity : i
  }
  return (a: string, b: string) => rank(a) - rank(b)
}

// Stock ceiling for the quantity stepper (unmanaged / backorder → MAX_QTY).
const maxQty = (v?: Variant) =>
  !v ? 1 : !v.manage_inventory || v.allow_backorder ? MAX_QTY : Math.max(1, Math.min(MAX_QTY, v.inventory_quantity ?? 0))

export default function BuyBox({ product, showSizeGuide }: { product: HttpTypes.StoreProduct; showSizeGuide: boolean }) {
  const router = useRouter()
  const countryCode = useParams().countryCode as string
  // Admin variant order (variant_rank) drives both the default choice and the
  // order of option values (S, M, L rather than database order).
  const variants = useMemo(
    () => [...(product.variants ?? [])].sort((a, b) => (a.variant_rank ?? 0) - (b.variant_rank ?? 0)),
    [product.variants]
  )
  const options = useMemo(
    () =>
      (product.options ?? [])
        .filter((o) => (o.values?.length ?? 0) > 0)
        .map((o) => ({ ...o, values: [...o.values!].sort((a, b) => valueOrder(o.values!, variants, o.id)(a.value, b.value)) })),
    [product.options, variants]
  )

  const [selected, setSelected] = useState(() => keymap(variants.find(isVariantInStock) ?? variants[0]))
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState<"add" | "buy" | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // ?v_id= preselects a variant (links from structured data / shared links).
  useEffect(() => {
    const v = variants.find((x) => x.id === new URLSearchParams(window.location.search).get("v_id"))
    if (v) setSelected(keymap(v))
  }, [variants])

  const variant = useMemo(
    () => variants.find((v) => options.every((o) => keymap(v)[o.id] === selected[o.id])) ?? (variants.length === 1 ? variants[0] : undefined),
    [variants, options, selected]
  )
  const inStock = isVariantInStock(variant)
  const { price, mrp, discount } = priceOf(variant)

  useEffect(() => {
    setQty((q) => Math.min(q, maxQty(variant)))
    if (variant && variants.length > 1) {
      const url = new URL(window.location.href)
      url.searchParams.set("v_id", variant.id)
      window.history.replaceState(null, "", url)
    }
  }, [variant, variants.length])

  // A value is offered if some variant has it together with the other current choices.
  const valueState = (optionId: string, value: string) => {
    const match = variants.find((v) => {
      const k = keymap(v)
      return k[optionId] === value && options.every((o) => o.id === optionId || k[o.id] === selected[o.id])
    })
    return match ? (isVariantInStock(match) ? "ok" : "oos") : "none"
  }

  const add = async (mode: "add" | "buy") => {
    if (!variant || !inStock) return
    setBusy(mode)
    setMessage(null)
    try {
      await addToCart({ variantId: variant.id, quantity: qty, countryCode })
      notifyCartUpdated()
      if (mode === "buy") {
        router.push("/checkout?step=address")
        return
      }
      setMessage({ ok: true, text: `Added ${qty} to your cart.` })
    } catch {
      setMessage({ ok: false, text: "Could not add to cart. Please try again." })
    }
    setBusy(null)
  }

  const actionsRef = useRef<HTMLDivElement>(null)
  const actionsVisible = useIntersection(actionsRef, "0px")
  const disabled = !variant || !inStock || busy !== null
  const label = !variant ? "Select options" : !inStock ? "Out of stock" : "Add to cart"

  return (
    <div className="flex flex-col gap-5">
      {/* Price block */}
      <div>
        {price != null ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold text-ink">{inr(price)}</span>
            {mrp && (
              <>
                <span className="text-base text-ink-muted">
                  MRP <s>{inr(mrp)}</s>
                </span>
                <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">{discount}% off</span>
              </>
            )}
          </div>
        ) : (
          <p className="text-lg text-ink-muted">Price on request</p>
        )}
        <p className="mt-1 text-xs text-ink-muted">Inclusive of all taxes</p>
      </div>

      {/* Variant selector */}
      {variants.length > 1 &&
        options.map((o) => (
          <fieldset key={o.id}>
            <div className="mb-2 flex items-center justify-between">
              <legend className="text-sm font-semibold text-ink">
                {o.title}: <span className="font-normal text-ink-soft">{selected[o.id] ?? "Select"}</span>
              </legend>
              {showSizeGuide && /size/i.test(o.title ?? "") && <SizeGuide />}
            </div>
            <div className="flex flex-wrap gap-2">
              {o.values!.map((v) => {
                const state = valueState(o.id, v.value)
                const active = selected[o.id] === v.value
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={state === "none"}
                    aria-pressed={active}
                    onClick={() => setSelected((s) => ({ ...s, [o.id]: v.value }))}
                    className={`min-h-[44px] min-w-[52px] rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      active ? "border-primary bg-primary text-white" : "border-champagne bg-white text-ink hover:border-primary"
                    } ${state === "oos" ? "line-through decoration-1" : ""}`}
                  >
                    {v.value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      {variants.length <= 1 && showSizeGuide && <SizeGuide />}

      {variant && (
        <p className={`text-sm font-semibold ${inStock ? "text-green-700" : "text-red-700"}`}>
          {inStock ? "In stock" : "Out of stock"}
        </p>
      )}

      {/* Quantity + actions. Without JS the form still posts to /cart/add. */}
      <form
        method="post"
        action="/cart/add"
        onSubmit={(e) => {
          e.preventDefault()
          add("add")
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="product_id" value={product.id} />
        <input type="hidden" name="variant_id" value={variant?.id ?? ""} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink" id="qty-label">Quantity</span>
          <div className="flex items-center rounded-full border border-champagne bg-white" role="group" aria-labelledby="qty-label">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-40">
              <Minus className="h-4 w-4" />
            </button>
            <input
              name="quantity"
              value={qty}
              readOnly
              aria-live="polite"
              aria-label="Quantity"
              className="w-8 bg-transparent text-center text-base font-semibold"
            />
            <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty(variant)} onClick={() => setQty((q) => q + 1)} className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-40">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div ref={actionsRef} className="flex gap-3">
          <button type="submit" disabled={disabled} className="h-12 flex-1 rounded-full border-2 border-primary text-base font-semibold text-primary hover:bg-primary/5 disabled:opacity-50">
            {busy === "add" ? "Adding…" : label}
          </button>
          <button type="button" disabled={disabled} onClick={() => add("buy")} className="h-12 flex-1 rounded-full bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            {busy === "buy" ? "Please wait…" : "Buy now"}
          </button>
        </div>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </form>

      {/* Sticky bar on mobile, above the bottom navigation, once the main buttons scroll away. */}
      <div
        className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 border-t border-champagne bg-ivory px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-transform small:hidden ${
          actionsVisible ? "pointer-events-none translate-y-[200%]" : "translate-y-0"
        }`}
        aria-hidden={actionsVisible}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink-soft">{product.title}</p>
          {price != null && <p className="font-semibold text-ink">{inr(price)}</p>}
        </div>
        <button
          type="button"
          tabIndex={actionsVisible ? -1 : 0}
          disabled={disabled}
          onClick={() => add("add")}
          className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "add" ? "Adding…" : label}
        </button>
      </div>
    </div>
  )
}
