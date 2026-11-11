import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"
import AccountNav from "../components/account-nav"

// Account shell: section nav (tabs on phones, sidebar from tablet) + content.
export default function AccountLayout({ customer, children }: { customer: HttpTypes.StoreCustomer | null; children: React.ReactNode }) {
  return (
    <div className="flex-1" data-testid="account-page">
      <div className="content-container mx-auto flex max-w-5xl flex-col py-6 small:py-12">
        <div className="grid grid-cols-1 gap-6 small:grid-cols-[220px_1fr] small:gap-10">
          {customer && <AccountNav customer={customer} />}
          <div className={`min-w-0 ${customer ? "" : "small:col-span-2"}`}>{children}</div>
        </div>
        <p className="mt-10 border-t border-champagne pt-6 text-sm text-ink-soft">
          Need help with an order?{" "}
          <LocalizedClientLink href="/contact" className="font-semibold text-primary hover:underline">
            Contact us
          </LocalizedClientLink>
        </p>
      </div>
    </div>
  )
}
