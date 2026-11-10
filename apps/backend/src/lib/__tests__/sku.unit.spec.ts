import { nextSku, skuPrefix } from "../sku"

describe("sku", () => {
  it("builds the prefix from type code and deity tag", () => {
    expect(
      skuPrefix({
        type: { value: "Locket", metadata: { sku_code: "LKT" } },
        tags: [{ value: "intention:Protection" }, { value: "deity:Hanuman" }],
      })
    ).toBe("DA-LKT-HAN")
    expect(skuPrefix({ type: { value: "Rudraksha" }, tags: [{ value: "deity:Sai Baba" }] })).toBe(
      "DA-RUD-SAI"
    )
    expect(skuPrefix({ type: null, tags: [] })).toBe("DA-GEN-GEN")
  })

  it("continues numbering after the highest existing SKU", () => {
    expect(nextSku("DA-LKT-HAN", [])).toBe("DA-LKT-HAN-001")
    expect(nextSku("DA-LKT-HAN", ["DA-LKT-HAN-001", "DA-LKT-HAN-007", "DA-LKT-HANX-099", "custom"])).toBe(
      "DA-LKT-HAN-008"
    )
  })
})
