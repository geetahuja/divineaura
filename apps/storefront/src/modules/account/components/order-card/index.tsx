import { countProducts, productLines } from "@lib/util/cart-availability"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

// One order in Account → Orders. Products only — the COD fee is in the order's totals.
const OrderCard = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const lines = productLines(order.items)
  const count = countProducts(order.items)

  return (
    <div className="flex flex-col rounded-lg border border-champagne bg-white p-4" data-testid="order-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-serif text-xl font-semibold text-primary">
          Order #<span data-testid="order-display-id">{order.display_id}</span>
        </p>
        <p className="text-sm font-semibold text-ink" data-testid="order-amount">
          {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
        </p>
      </div>
      <p className="text-sm text-ink-soft">
        <span data-testid="order-created-at">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        {" · "}
        {count} {count === 1 ? "item" : "items"}
        {order.status === "canceled" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">Cancelled</span>}
      </p>
      <ul className="my-3 grid grid-cols-3 gap-3 small:grid-cols-4">
        {lines.slice(0, 3).map((i) => (
          <li key={i.id} className="flex flex-col gap-1" data-testid="order-item">
            <Thumbnail thumbnail={i.thumbnail} images={[]} size="square" />
            <span className="line-clamp-2 text-xs text-ink" data-testid="item-title">
              {i.product_title ?? i.title} <span className="text-ink-muted">× <span data-testid="item-quantity">{i.quantity}</span></span>
            </span>
          </li>
        ))}
        {lines.length > 3 && (
          <li className="flex items-center justify-center rounded-md border border-champagne text-sm text-ink-soft">+{lines.length - 3} more</li>
        )}
      </ul>
      <LocalizedClientLink
        href={`/account/orders/details/${order.id}`}
        data-testid="order-details-link"
        className="self-end rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
      >
        View order
      </LocalizedClientLink>
    </div>
  )
}

export default OrderCard
