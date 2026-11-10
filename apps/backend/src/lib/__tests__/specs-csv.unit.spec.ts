import { csvRowToSpecs } from "../specs-csv"

describe("csvRowToSpecs", () => {
  it("coerces numbers, booleans and blanks", () => {
    const r = csvRowToSpecs({
      handle: " tiger-eye ",
      material: "Natural Tiger Eye",
      stone_type: "Tiger Eye",
      stone_origin: "natural",
      bead_size_mm: "8",
      bead_count: "21",
      chain_included: "Yes",
      mantra: "",
      hsn_code: "7117",
    })
    expect(r).toEqual({
      ok: true,
      handle: "tiger-eye",
      specs: expect.objectContaining({
        bead_size_mm: 8,
        bead_count: 21,
        chain_included: true,
        mantra: null,
        stone_origin: "natural",
      }),
    })
  })

  it("rejects bad rows with a readable reason", () => {
    expect(csvRowToSpecs({ handle: "", material: "x" })).toMatchObject({ ok: false })
    expect(csvRowToSpecs({ handle: "a", stone_type: "Amethyst" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("stone_origin"),
    })
    expect(csvRowToSpecs({ handle: "a", weight_g: "ten" })).toMatchObject({ ok: false })
    expect(csvRowToSpecs({ handle: "a", colur: "red" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("colur"),
    })
  })
})
