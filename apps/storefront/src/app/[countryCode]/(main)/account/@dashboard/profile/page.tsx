import { retrieveCustomer } from "@lib/data/customer"
import { getConsent } from "@lib/data/profile"
import ProfileForm from "@modules/account/components/profile-form"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Profile",
  description: "Your name, email and message preferences.",
}

export default async function Profile() {
  const [customer, consent] = await Promise.all([retrieveCustomer(), getConsent()])
  if (!customer) notFound()

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <h1 className="mb-6 font-serif text-3xl font-semibold text-primary">Profile</h1>
      <ProfileForm customer={customer} consent={consent} />
    </div>
  )
}
