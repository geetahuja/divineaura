import { amountInWords, documentNumber, financialYear, splitTax, stateCode } from "../gst-invoice"
import { mergeWishlist } from "../wishlist"
import { canCustomerCancel, planReturn, refundable, returnWindow, undeliveredRefund } from "../order-rules"

describe("GST split", () => {
  const lines = [
    { kind: "goods" as const, description: "Locket", hsn: "7117", quantity: 1, total: 569.05, tax: 16.57, rate: 3 },
    { kind: "cod_fee" as const, description: "COD fee", hsn: null, quantity: 1, total: 49, tax: 1.43, rate: 3 },
  ]
  it("splits CGST + SGST within the seller's state, exactly adding up", () => {
    const { lines: l, totals } = splitTax(lines, true, 618.05)
    expect(l[0]).toMatchObject({ taxable: 552.48, cgst: 8.29, sgst: 8.28, igst: 0 })
    expect(totals.cgst + totals.sgst).toBeCloseTo(16.57 + 1.43, 2)
    expect(totals.roundOff).toBe(0)
  })
  it("uses IGST across states", () => {
    const { lines: l, totals } = splitTax(lines, false, 618.05)
    expect(l[0]).toMatchObject({ cgst: 0, sgst: 0, igst: 16.57 })
    expect(totals.igst).toBe(18)
  })
  it("rounds lines to paise and shows the leftover as round off", () => {
    const { totals } = splitTax([{ ...lines[0], total: 333.333, tax: 9.709 }], true, 333.34)
    expect(totals.roundOff).toBe(0.01)
    expect(totals.taxable + totals.cgst + totals.sgst + totals.roundOff).toBeCloseTo(333.34, 2)
  })
  it("knows state codes", () => {
    expect(stateCode("Maharashtra")).toBe("27")
    expect(stateCode("orissa")).toBe("21")
    expect(stateCode("Atlantis")).toBeNull()
  })
  it("writes amounts in words (Indian system)", () => {
    expect(amountInWords(125000.5)).toBe("Rupees One Lakh Twenty Five Thousand and Fifty Paise Only")
  })
})

describe("invoice numbering", () => {
  it("switches financial year on 1 April (IST)", () => {
    expect(financialYear(new Date("2027-03-31T18:29:00Z"))).toBe("26-27") // 31 Mar 23:59 IST
    expect(financialYear(new Date("2027-03-31T18:31:00Z"))).toBe("27-28") // 1 Apr 00:01 IST
    expect(financialYear(new Date("2099-06-01T00:00:00Z"))).toBe("99-00")
  })
  it("formats within 16 characters and refuses longer", () => {
    expect(documentNumber("AS", "26-27", 1)).toBe("AS/26-27/00001")
    expect(documentNumber("CN", "26-27", 12345).length).toBeLessThanOrEqual(16)
    expect(() => documentNumber("DIVINE", "26-27", 1)).toThrow(/16/)
  })
})

describe("cancel and return rules", () => {
  it("allows cancelling only before packing", () => {
    expect(canCustomerCancel({ status: "pending", timeline: ["placed", "confirmed"] }).ok).toBe(true)
    expect(canCustomerCancel({ status: "pending", timeline: ["placed", "confirmed", "packed"] }).ok).toBe(false)
    expect(canCustomerCancel({ status: "canceled", timeline: ["placed", "cancelled"] }).ok).toBe(false)
  })
  it("opens returns on delivery for the window", () => {
    const d = new Date("2026-11-01T10:00:00Z")
    const o = { status: "completed", timeline: ["delivered"], deliveredAt: d }
    expect(returnWindow(o, 7, new Date("2026-11-08T09:00:00Z")).open).toBe(true)
    expect(returnWindow(o, 7, new Date("2026-11-08T11:00:00Z")).open).toBe(false)
    expect(returnWindow({ ...o, timeline: ["shipped"] }, 7).open).toBe(false)
  })
  const lines = [
    { id: "a", quantity: 2, total: 1138.1, returnable: true, alreadyReturned: 0, alreadyRefunded: 0 }, // 2 × 599 less 5% prepaid
    { id: "b", quantity: 1, total: 299, returnable: false, alreadyReturned: 0, alreadyRefunded: 0 },
  ]
  it("refunds the paid share for partial returns (discount kept, fees not refunded)", () => {
    expect(planReturn(lines, [{ item_id: "a", quantity: 1 }])).toMatchObject({ ok: true, refund: 569.05 })
  })
  it("refuses not-returnable items and over-returns", () => {
    expect(planReturn(lines, [{ item_id: "b", quantity: 1 }]).errors).toContain("This item is not returnable")
    expect(planReturn([{ ...lines[0], alreadyReturned: 2 }], [{ item_id: "a", quantity: 1 }]).ok).toBe(false)
  })
  it("damaged / wrong item: accepted even if not returnable, with shipping + COD fee refunded once", () => {
    const fees = [
      { id: "shipping", title: "Shipping", total: 49, alreadyRefunded: 0 },
      { id: "fee1", title: "Cash on Delivery fee", total: 49, alreadyRefunded: 0 },
    ]
    const r = planReturn(lines, [{ item_id: "b", quantity: 1 }], { reason: "damaged", fees })
    expect(r).toMatchObject({ ok: true, refund: 397 }) // 299 + 49 + 49
    expect(r.items.map((i) => i.item_id)).toEqual(["b", "shipping", "fee1"])
    // a second damaged return on the same order doesn't refund the fees again
    const again = planReturn(lines, [{ item_id: "a", quantity: 1 }], { reason: "wrong_item", fees: fees.map((f) => ({ ...f, alreadyRefunded: f.total })) })
    expect(again.refund).toBe(569.05)
    // changed mind: fees not refunded, not-returnable still refused
    expect(planReturn(lines, [{ item_id: "a", quantity: 1 }], { reason: "changed_mind", fees }).refund).toBe(569.05)
    expect(planReturn(lines, [{ item_id: "b", quantity: 1 }], { reason: "quality", fees }).ok).toBe(false)
  })
  it("undelivered prepaid parcel: full refund if courier failed, minus shipping if refused / wrong address", () => {
    const p = { captured: 618, refunded: 0, shipping: 49 }
    expect(undeliveredRefund("courier_failed", p)).toEqual({ deduction: 0, amount: 618 })
    expect(undeliveredRefund("customer_refused", p)).toEqual({ deduction: 49, amount: 569 })
    expect(undeliveredRefund("wrong_address", { ...p, refunded: 600 })).toEqual({ deduction: 49, amount: 0 })
  })
  it("never refunds twice", () => {
    expect(planReturn([{ ...lines[0], alreadyReturned: 1, alreadyRefunded: 1138.1 }], [{ item_id: "a", quantity: 1 }]).refund).toBe(0)
    expect(refundable(618.05, 569.05, 569.05)).toBe(49)
    expect(refundable(618.05, 618.05, 10)).toBe(0)
  })
})

describe("wishlist merge on login", () => {
  it("keeps the account list, adds browser items once, caps at 100", () => {
    expect(mergeWishlist(["prod_a", "prod_b"], ["prod_b", "prod_c"])).toEqual(["prod_a", "prod_b", "prod_c"])
    expect(mergeWishlist(["prod_a"], ["prod_z"], true)).toEqual(["prod_z", "prod_a"])
    expect(mergeWishlist(Array.from({ length: 99 }, (_, i) => `prod_${i}`), ["prod_x", "prod_y"]).length).toBe(100)
  })
})
