"use server"

// PIN-code delivery check (ARCHITECTURE.md §5.9). The UI calls only this
// function. Milestone 8 replaces the body with a call to the backend route that
// asks Shiprocket; the result shape stays the same.
export type DeliveryCheck =
  | { status: "invalid" }
  | { status: "unavailable" } // checks not live yet (until milestone 8)
  | { status: "serviceable"; etaDays: { min: number; max: number }; cod: boolean }
  | { status: "not_serviceable" }

export async function checkDelivery(pin: string): Promise<DeliveryCheck> {
  // Indian PIN codes: 6 digits, first digit 1–9.
  if (!/^[1-9]\d{5}$/.test(pin.trim())) {
    return { status: "invalid" }
  }
  return { status: "unavailable" }
}
