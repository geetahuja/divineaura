import { retrieveCustomer } from "@lib/data/customer"
import AddressBook from "@modules/account/components/address-book"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Addresses",
  description: "Your saved delivery addresses.",
}

export default async function Addresses() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <h1 className="font-serif text-3xl font-semibold text-primary">Addresses</h1>
      <p className="mb-6 mt-1 text-sm text-ink-soft">Your default address is filled in automatically at checkout.</p>
      <AddressBook customer={customer} />
    </div>
  )
}
