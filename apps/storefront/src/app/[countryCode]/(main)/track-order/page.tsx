import { Metadata } from "next"
import TrackOrderForm from "./track-order-form"

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the delivery status of your DivineAura order with your order number and mobile number.",
  alternates: { canonical: "/track-order" },
}

export default function TrackOrderPage() {
  return (
    <div className="content-container flex justify-center py-10 small:py-16">
      <TrackOrderForm />
    </div>
  )
}
