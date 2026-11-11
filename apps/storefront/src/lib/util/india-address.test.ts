import assert from "node:assert/strict"
import { test } from "node:test"
import { isValidPin, normalizeIndianMobile, validateIndianAddress } from "./india-address"

test("mobile numbers", () => {
  assert.equal(normalizeIndianMobile("98765 43210"), "+919876543210")
  assert.equal(normalizeIndianMobile("+91-98765-43210"), "+919876543210")
  assert.equal(normalizeIndianMobile("09876543210"), "+919876543210")
  assert.equal(normalizeIndianMobile("5876543210"), null) // must start 6–9
  assert.equal(normalizeIndianMobile("98765"), null)
})

test("PIN codes", () => {
  assert.ok(isValidPin("411001"))
  assert.ok(!isValidPin("011001"))
  assert.ok(!isValidPin("41100"))
})

test("address validation forces India and normalises phone", () => {
  const base = { first_name: " Asha ", last_name: "", address_1: "1 MG Road", address_2: "", postal_code: "411001", city: "Pune", province: "Maharashtra", phone: "9876543210" }
  const r = validateIndianAddress(base)
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.address.country_code, "in")
    assert.equal(r.address.phone, "+919876543210")
    assert.equal(r.address.first_name, "Asha")
  }
  assert.deepEqual(validateIndianAddress({ ...base, province: "Maharashtr" }), { ok: false, error: "Please choose your state." })
  assert.equal(validateIndianAddress({ ...base, phone: "12" }).ok, false)
})
