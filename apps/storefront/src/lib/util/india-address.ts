// India-only checkout rules (ARCHITECTURE.md §9). Used by the address form for
// hints and by the setAddresses server action as the real check.

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
] as const

// "98765 43210", "+91-9876543210", "09876543210" → "+919876543210"; null if not a valid Indian mobile.
export const normalizeIndianMobile = (input: string): string | null => {
  const digits = input.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "")
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null
}

// Indian PIN codes: 6 digits, not starting with 0.
export const isValidPin = (pin: string) => /^[1-9]\d{5}$/.test(pin.trim())

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

export type AddressInput = {
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  postal_code: string
  city: string
  province: string
  phone: string
}

// Returns the cleaned address (country fixed to India) or the first problem found.
export function validateIndianAddress(a: AddressInput): { ok: true; address: AddressInput & { country_code: "in" } } | { ok: false; error: string } {
  const t = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, (v ?? "").trim()])) as AddressInput
  if (!t.first_name) return { ok: false, error: "Please enter your first name." }
  if (!t.address_1) return { ok: false, error: "Please enter your house / street address." }
  if (!isValidPin(t.postal_code)) return { ok: false, error: "Please enter a valid 6-digit PIN code." }
  if (!t.city) return { ok: false, error: "Please enter your city." }
  if (!(INDIAN_STATES as readonly string[]).includes(t.province)) return { ok: false, error: "Please choose your state." }
  const phone = normalizeIndianMobile(t.phone)
  if (!phone) return { ok: false, error: "Please enter a valid 10-digit mobile number." }
  return { ok: true, address: { ...t, phone, country_code: "in" } }
}
