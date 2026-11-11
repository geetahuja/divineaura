"use client"

import { codFeeTotal } from "@lib/util/cart-availability"
import { convertToLocale } from "@lib/util/money"
import React from "react"

// Prices are GST-inclusive, so every line shows tax-inclusive amounts
// (item_total, shipping_total, discount_total) and GST is shown as "included".
// The COD fee is a server-priced line item, shown here as its own fee line
// (never as a product) — used for carts, checkout, confirmation and orders.
type CartTotalsProps = {
  totals: {
    total?: number | null
    tax_total?: number | null
    currency_code: string
    item_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    shipping_methods?: unknown[] | null
    items?: { metadata?: Record<string, unknown> | null; total?: number | null; unit_price?: number | null }[] | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const { currency_code, total, tax_total, item_total, shipping_total, discount_total, shipping_methods, items } = totals
  const money = (amount?: number | null) => convertToLocale({ amount: amount ?? 0, currency_code })
  const codFee = codFeeTotal(items)
  // item_total includes the fee line and is before discounts; show products only.
  const subtotal = (item_total ?? 0) - codFee

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span data-testid="cart-subtotal" data-value={subtotal}>
            {money(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span data-testid="cart-shipping" data-value={shipping_total || 0}>
            {!shipping_methods?.length ? "Calculated at checkout" : shipping_total ? money(shipping_total) : "Free"}
          </span>
        </div>
        {codFee > 0 && (
          <div className="flex items-center justify-between">
            <span>Cash on Delivery fee</span>
            <span data-testid="cart-cod-fee" data-value={codFee}>
              {money(codFee)}
            </span>
          </div>
        )}
        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span className="text-ui-fg-interactive" data-testid="cart-discount" data-value={discount_total || 0}>
              - {money(discount_total)}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-champagne my-4" />
      <div className="flex items-center justify-between text-ui-fg-base txt-medium">
        <span>Total</span>
        <span className="txt-xlarge-plus" data-testid="cart-total" data-value={total || 0}>
          {money(total)}
        </span>
      </div>
      <p className="mt-1 text-right text-xs text-ui-fg-muted" data-testid="cart-taxes">
        Inclusive of all taxes (GST {money(tax_total)})
      </p>
      <div className="h-px w-full border-b border-champagne mt-4" />
    </div>
  )
}

export default CartTotals
