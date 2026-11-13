import { listOrders } from "@lib/data/orders"
import OrderOverview from "@modules/account/components/order-overview"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Orders",
  description: "Your orders.",
}

export default async function Orders() {
  const orders = await listOrders()
  if (!orders) notFound()

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <h1 className="font-serif text-3xl font-semibold text-primary">Orders</h1>
      <p className="mb-6 mt-1 text-sm text-ink-soft">Track, download invoices, cancel before packing, or request a return after delivery.</p>
      <OrderOverview orders={orders} />
    </div>
  )
}
