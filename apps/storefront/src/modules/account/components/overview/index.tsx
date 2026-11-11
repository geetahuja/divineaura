import { HttpTypes } from "@medusajs/types"
import OrderCard from "@modules/account/components/order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Stat = ({ href, value, label }: { href: string; value: number | string; label: string }) => (
  <LocalizedClientLink href={href} className="rounded-lg border border-champagne bg-white p-4 hover:border-primary">
    <p className="font-serif text-2xl font-semibold text-primary">{value}</p>
    <p className="text-sm text-ink-soft">{label}</p>
  </LocalizedClientLink>
)

// Account overview: who is signed in, quick links, recent orders.
export default function Overview({ customer, orders }: { customer: HttpTypes.StoreCustomer | null; orders: HttpTypes.StoreOrder[] | null }) {
  const signedInAs = customer?.phone ? `+91 ${customer.phone.replace(/^\+91/, "")}` : customer?.email
  return (
    <div data-testid="overview-page-wrapper" className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-primary" data-testid="welcome-message" data-value={customer?.first_name}>
          Hello{customer?.first_name ? ` ${customer.first_name}` : ""}
        </h1>
        <p className="text-sm text-ink-soft">
          Signed in with <span className="font-semibold text-ink" data-testid="customer-email">{signedInAs}</span>
        </p>
        {!customer?.first_name && (
          <p className="mt-2 text-sm text-ink-soft">
            <LocalizedClientLink href="/account/profile" className="font-semibold text-primary hover:underline">Add your name</LocalizedClientLink> so we know how to greet you.
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat href="/account/orders" value={orders?.length ?? 0} label="Orders" />
        <Stat href="/account/addresses" value={customer?.addresses?.length ?? 0} label="Addresses" />
        <Stat href="/wishlist" value="♡" label="Wishlist" />
      </div>
      <section aria-labelledby="recent-orders" className="flex flex-col gap-3">
        <h2 id="recent-orders" className="font-serif text-xl font-semibold text-primary">Recent orders</h2>
        {orders?.length ? (
          <ul className="flex flex-col gap-3" data-testid="orders-wrapper">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft" data-testid="no-orders-message">
            No orders yet.{" "}
            <LocalizedClientLink href="/shop" className="font-semibold text-primary hover:underline">Start shopping</LocalizedClientLink>
          </p>
        )}
      </section>
    </div>
  )
}
