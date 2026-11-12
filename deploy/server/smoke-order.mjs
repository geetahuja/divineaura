// End-to-end test order on STAGING through the public HTTPS APIs (deploy/server/smoke-order.sh):
// product → cart → address → delivery → online payment via the TEST gateway (signed
// webhook) → order Paid → invoice → packed → TEST courier shipment → tracking webhooks
// → delivered → messages in the log. Cleans up its test product. Refuses on live.
const API = process.env.API_URL
const SITE = process.env.SITE_URL
const PK = process.env.PUBLISHABLE_KEY
const { SMOKE_EMAIL, SMOKE_PASSWORD } = process.env
const PIN = process.env.SMOKE_PIN || "400001"
const out = []
const step = (name, detail = "") => {
  out.push(`✔ ${name}${detail ? ` — ${detail}` : ""}`)
  console.log(out.at(-1))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let token = ""
async function call(method, path, body, { admin = false } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(admin ? { authorization: `Bearer ${token}` } : { "x-publishable-api-key": PK }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 300) }
  }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(json).slice(0, 400)}`)
  return json
}
const store = (m, p, b) => call(m, p, b)
const admin = (m, p, b) => call(m, p, b, { admin: true })

let productId = null
try {
  // Admin login (temporary smoke-test admin created by smoke-order.sh)
  token = (await call("POST", "/auth/user/emailpass", { email: SMOKE_EMAIL, password: SMOKE_PASSWORD })).token
  step("Admin login")

  // Warehouse PIN (needed for courier checks); set a placeholder only if missing.
  const { stock_locations } = await admin("GET", "/admin/stock-locations?fields=id,name,address.*")
  const loc = stock_locations[0]
  if (!/^[1-9]\d{5}$/.test(loc?.address?.postal_code ?? "")) {
    await admin("POST", `/admin/stock-locations/${loc.id}`, { address: { address_1: "Warehouse address to be updated", city: "Mumbai", province: "Maharashtra", postal_code: PIN, country_code: "IN" } })
    step("Warehouse PIN was empty", `set placeholder ${PIN} (Mumbai) — replace in Settings → Locations`)
  }

  const [{ shipping_profiles }, { sales_channels }] = await Promise.all([admin("GET", "/admin/shipping-profiles"), admin("GET", "/admin/sales-channels")])
  const { product } = await admin("POST", "/admin/products", {
    title: "TEST – staging smoke product",
    handle: `staging-smoke-${Date.now()}`,
    status: "published",
    shipping_profile_id: shipping_profiles[0].id,
    sales_channels: [{ id: sales_channels[0].id }],
    options: [{ title: "Size", values: ["One size"] }],
    variants: [{ title: "One size", sku: `SMOKE-${Date.now()}`, manage_inventory: false, options: { Size: "One size" }, prices: [{ currency_code: "inr", amount: 499 }] }],
  })
  productId = product.id
  const variantId = product.variants[0].id
  step("Test product created", "₹499, published")

  // Storefront: delivery check, cart, address, shipping
  const check = await store("GET", `/store/delivery-check?pincode=${PIN}`)
  step("Delivery check", `${PIN}: ${check.status}${check.etaDays ? `, ${check.etaDays.min}–${check.etaDays.max} days` : ""}, COD ${check.cod ? "yes" : "no"}`)
  const { regions } = await store("GET", "/store/regions")
  let { cart } = await store("POST", "/store/carts", { region_id: regions[0].id, email: "staging-test@divinesanatani.com" })
  ;({ cart } = await store("POST", `/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 2 }))
  const address = { first_name: "Staging", last_name: "Tester", address_1: "1 Test Road", city: "Mumbai", province: "Maharashtra", postal_code: PIN, country_code: "in", phone: "+919999999999" }
  ;({ cart } = await store("POST", `/store/carts/${cart.id}`, { shipping_address: address, billing_address: address }))
  const { shipping_options } = await store("GET", `/store/shipping-options?cart_id=${cart.id}`)
  ;({ cart } = await store("POST", `/store/carts/${cart.id}/shipping-methods`, { option_id: shipping_options[0].id }))
  step("Cart", `2 × ₹499, shipping ₹${cart.shipping_total} (${shipping_options[0].name}), tax ₹${cart.tax_total}`)

  // Online payment through the test gateway
  await store("POST", `/store/carts/${cart.id}/payment-method`, { method: "online" })
  const { payment_collection } = await store("POST", "/store/payment-collections", { cart_id: cart.id })
  const pc = await store("POST", `/store/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_test-payment_test-payment" })
  const session = pc.payment_collection.payment_sessions.find((s) => s.provider_id === "pp_test-payment_test-payment")
  ;({ cart } = await store("GET", `/store/carts/${cart.id}`))
  step("Payment session", `total ₹${cart.total} (prepaid discount ₹${cart.discount_total})`)
  await store("POST", "/store/test-payment/simulate", { payment_session_id: session.id, outcome: "success" })
  step("Test gateway", "payment succeeded; signed webhook sent")
  const done = await store("POST", `/store/carts/${cart.id}/complete`)
  if (done.type !== "order") throw new Error(`cart not completed: ${JSON.stringify(done).slice(0, 300)}`)
  const order = done.order
  step("Order placed", `#${order.display_id}`)

  // Paid comes from the webhook (processed by the worker after Medusa's 5 s delay)
  let status = ""
  for (let i = 0; i < 30 && status !== "captured"; i++) {
    await sleep(2000)
    status = (await admin("GET", `/admin/orders/${order.id}?fields=payment_status`)).order.payment_status
  }
  if (status !== "captured") throw new Error(`payment_status is ${status}, expected captured`)
  step("Order Paid via verified webhook", "payment_status=captured")

  const docs = await admin("GET", `/admin/orders/${order.id}/documents`)
  step("GST invoice", docs.invoice?.number ?? JSON.stringify(docs).slice(0, 120))

  // Shipping with the test courier + tracking webhooks
  await admin("POST", `/admin/shipping/orders/${order.id}/packed`, {})
  const { shipment } = await admin("POST", `/admin/shipping/orders/${order.id}/shipment`, { provider: "test" })
  step("Shipment (test courier)", `${shipment.courier_name}, AWB ${shipment.awb}`)
  for (const s of ["out_for_delivery", "delivered"]) {
    await admin("POST", `/admin/shipping/orders/${order.id}/simulate`, { status: s })
    await sleep(1500)
  }
  const ov = await admin("GET", `/admin/shipping/orders/${order.id}`)
  step("Timeline", ov.events.map((e) => e.status).join(" → "))
  if (!ov.events.some((e) => e.status === "delivered")) throw new Error("not delivered")

  await sleep(3000)
  const log = await admin("GET", `/admin/message-log?order=${order.display_id}`)
  step("Customer messages", log.messages.map((m) => `${m.event}/${m.channel}:${m.status}`).reverse().join(", ") || "none")

  const page = await fetch(`${SITE}/`, { headers: { authorization: process.env.SITE_AUTH ?? "" } })
  const html = await page.text()
  step("Storefront", `HTTP ${page.status}, X-Robots-Tag "${page.headers.get("x-robots-tag")}", banner ${html.includes("da-staging") ? "present" : "MISSING"}`)
  console.log(`\nRESULT: PASS — order #${order.display_id}`)
} catch (e) {
  console.log(`\n✘ ${e.message}\nRESULT: FAIL`)
  process.exitCode = 1
} finally {
  if (productId) await admin("DELETE", `/admin/products/${productId}`).then(() => console.log("(test product deleted; the order keeps its copy)")).catch(() => undefined)
}
