import assert from "node:assert/strict"
import { test } from "node:test"
import { toGa4, toMeta } from "./analytics"
import { parseConsent, serializeConsent } from "./consent"

test("analytics payloads carry only product/order facts — no personal data", () => {
  const item = { item_id: "variant_1", item_name: "Hanuman Locket", price: 599.004, quantity: 2, email: "a@b.in", phone: "+919812345678", address: "1 MG Road" } as never
  const ga = toGa4({ name: "purchase", value: 1198, transaction_id: "21", shipping: 0, tax: 34.9, items: [item] })
  const text = JSON.stringify(ga)
  assert.ok(!/@|\+91|MG Road/.test(text), text)
  assert.deepEqual(ga.items[0], { item_id: "variant_1", item_name: "Hanuman Locket", price: 599, quantity: 2 })
  assert.equal(ga.currency, "INR")
  assert.equal(ga.transaction_id, "21")
})

test("GA4 events map to Meta standard events", () => {
  const items = [{ item_id: "v1", item_name: "Mala", price: 299, quantity: 1 }]
  assert.equal(toMeta({ name: "view_item", value: 299, items }).name, "ViewContent")
  assert.equal(toMeta({ name: "add_to_cart", value: 299, items }).name, "AddToCart")
  assert.equal(toMeta({ name: "begin_checkout", value: 299, items }).name, "InitiateCheckout")
  assert.equal(toMeta({ name: "add_payment_info", value: 299, payment_type: "cod", items }).name, "AddPaymentInfo")
  const p = toMeta({ name: "purchase", value: 299, transaction_id: "9", items })
  assert.deepEqual(p, { name: "Purchase", params: { currency: "INR", value: 299, content_type: "product", content_ids: ["v1"], contents: [{ id: "v1", quantity: 1 }], num_items: 1 } })
})

test("consent cookie round-trips; no or old cookie means 'not chosen yet'", () => {
  assert.deepEqual(parseConsent(serializeConsent({ analytics: true, marketing: false })), { analytics: true, marketing: false })
  assert.equal(parseConsent(null), null)
  assert.equal(parseConsent("garbage"), null)
  assert.equal(parseConsent(encodeURIComponent(JSON.stringify({ v: 0, a: true, m: true }))), null)
})
