import { mapShiprocketStatus } from "../couriers/shiprocket"
import { signTestCourier, TestCourier, testServiceability } from "../couriers/test"
import { canAdvance, fillGaps, merchandiseSubtotal, shipmentWeightGrams, shippingPrice, stateFromPin } from "../shipping"

const policy = { rate: 49, freeThreshold: 499 }

describe("free shipping", () => {
  const item = (unit_price: number, adjustments: { amount: number; code: string }[] = []) => ({ unit_price, quantity: 1, adjustments })
  const fee = { unit_price: 49, quantity: 1, metadata: { type: "cod_fee" } }

  it("ignores the COD fee line", () => {
    const cart = [item(460)]
    expect(shippingPrice(merchandiseSubtotal(cart), policy)).toBe(49)
    expect(shippingPrice(merchandiseSubtotal([...cart, fee]), policy)).toBe(49) // fee must not make it free
  })
  it("ignores the prepaid discount but counts coupons", () => {
    expect(shippingPrice(merchandiseSubtotal([item(510, [{ amount: 25.5, code: "PREPAID-ONLINE" }])]), policy)).toBe(0)
    expect(shippingPrice(merchandiseSubtotal([item(510, [{ amount: 20, code: "DIWALI20" }])]), policy)).toBe(49)
  })
  it("is free exactly at the threshold, and when no threshold is set never free", () => {
    expect(shippingPrice(499, policy)).toBe(0)
    expect(shippingPrice(10_000, { rate: 49, freeThreshold: null })).toBe(49)
  })
})

describe("weight", () => {
  it("uses weight_g × quantity, a default when blank, plus packaging", () => {
    expect(shipmentWeightGrams([{ quantity: 2, weight_g: 22 }, { quantity: 1, weight_g: null }], { itemGrams: 50, packagingGrams: 100 })).toBe(194)
    expect(shipmentWeightGrams([], { itemGrams: 50, packagingGrams: 0 })).toBe(1)
  })
})

describe("PIN → state", () => {
  it("maps postal circles", () => {
    expect(stateFromPin("411001")).toBe("Maharashtra")
    expect(stateFromPin("560001")).toBe("Karnataka")
    expect(stateFromPin("110001")).toBe("Delhi")
    expect(stateFromPin("012345")).toBeNull()
  })
})

describe("timeline rules", () => {
  it("moves forward once per status", () => {
    expect(canAdvance(["placed"], "confirmed")).toBe(true)
    expect(canAdvance(["placed", "confirmed"], "confirmed")).toBe(false) // duplicate webhook
    expect(canAdvance(["placed", "confirmed", "packed", "shipped", "out_for_delivery"], "shipped")).toBe(false) // late event
  })
  it("stops at terminal states", () => {
    expect(canAdvance(["placed", "shipped", "delivered"], "out_for_delivery")).toBe(false)
    expect(canAdvance(["placed", "cancelled"], "confirmed")).toBe(false)
  })
  it("allows cancel only before shipping and RTO only after", () => {
    expect(canAdvance(["placed", "confirmed", "packed"], "cancelled")).toBe(true)
    expect(canAdvance(["placed", "shipped"], "cancelled")).toBe(false)
    expect(canAdvance(["placed", "confirmed"], "rto")).toBe(false)
    expect(canAdvance(["placed", "shipped"], "rto")).toBe(true)
  })
  it("fills skipped courier steps", () => {
    expect(fillGaps(["placed", "confirmed", "packed", "shipped"], "delivered")).toEqual(["out_for_delivery", "delivered"])
    expect(fillGaps(["placed", "confirmed", "packed", "shipped", "delivered"], "delivered")).toEqual([])
  })
})

describe("test courier serviceability", () => {
  it("follows the documented test rules", () => {
    expect(testServiceability("411001", "900001").serviceable).toBe(false) // army post
    expect(testServiceability("411001", "411099")).toMatchObject({ serviceable: true, cod: false }) // ends in 99
    expect(testServiceability("411001", "411001")).toMatchObject({ serviceable: true, cod: true, etaDays: { min: 2, max: 4 } })
    expect(testServiceability("411001", "560001").etaDays).toEqual({ min: 4, max: 7 })
  })
})

describe("tracking webhooks", () => {
  const courier = new TestCourier("secret", "http://localhost:9000")
  const raw = JSON.stringify({ awb: "TEST1", status: "delivered", event_id: "e1" })
  it("accepts a correctly signed body only", () => {
    expect(courier.verifyWebhook({ "x-test-courier-signature": signTestCourier("secret", raw) }, raw)).toBe(true)
    expect(courier.verifyWebhook({ "x-test-courier-signature": signTestCourier("secret", raw) }, raw.replace("delivered", "rto"))).toBe(false)
    expect(courier.verifyWebhook({}, raw)).toBe(false)
  })
  it("maps Shiprocket statuses", () => {
    expect(mapShiprocketStatus("OUT FOR DELIVERY")).toBe("out_for_delivery")
    expect(mapShiprocketStatus("Delivered")).toBe("delivered")
    expect(mapShiprocketStatus("RTO INITIATED")).toBe("rto")
    expect(mapShiprocketStatus("IN TRANSIT")).toBe("shipped")
    expect(mapShiprocketStatus("PICKUP SCHEDULED")).toBeNull()
  })
})
