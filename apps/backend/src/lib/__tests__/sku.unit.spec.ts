import { nextSku, skuPrefix } from "../sku"

describe("sku", () => {
  it("builds the prefix from type code and deity tag", () => {
    expect(
      skuPrefix({
        type: { value: "Locket", metadata: { sku_code: "LKT" } },
        tags: [{ value: "intention:Protection" }, { value: "deity:Hanuman" }],
      })
    ).toBe("AS-LKT-HAN")
    expect(skuPrefix({ type: { value: "Rudraksha" }, tags: [{ value: "deity:Sai Baba" }] })).toBe(
      "AS-RUD-SAI"
    )
    expect(skuPrefix({ type: null, tags: [] })).toBe("AS-GEN-GEN")
  })

  it("continues numbering after the highest existing SKU", () => {
    expect(nextSku("AS-LKT-HAN", [])).toBe("AS-LKT-HAN-001")
    expect(nextSku("AS-LKT-HAN", ["AS-LKT-HAN-001", "AS-LKT-HAN-007", "AS-LKT-HANX-099", "custom"])).toBe(
      "AS-LKT-HAN-008"
    )
  })
})
