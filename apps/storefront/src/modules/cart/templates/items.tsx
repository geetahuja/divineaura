import { HttpTypes } from "@medusajs/types"
import CartLine from "@modules/cart/components/cart-line"
import { productLines } from "@lib/util/cart-availability"

export default function ItemsTemplate({ cart }: { cart?: HttpTypes.StoreCart }) {
  const items = [...productLines(cart?.items)].sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-primary small:text-4xl">Your cart</h1>
      <ul className="mt-2 border-t border-champagne">
        {items.map((item) => (
          <CartLine key={item.id} item={item} currencyCode={cart!.currency_code} />
        ))}
      </ul>
    </div>
  )
}
