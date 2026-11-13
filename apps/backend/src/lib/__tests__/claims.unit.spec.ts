import { findBannedClaims } from "../claims"

describe("banned claims", () => {
  it("flags result, healing, purity and official claims", () => {
    expect(findBannedClaims("Guaranteed to bring wealth")).toEqual(["guaranteed"])
    expect(findBannedClaims("This stone heals and cures stress")).toEqual(["cure", "heal"])
    expect(findBannedClaims("Pure Godavari water", "purity of the river")).toEqual(["pure", "purity"])
    expect(findBannedClaims("Official Kumbh product, Government approved")).toEqual(["official", "government approved"])
    expect(findBannedClaims("Same as Amrut Snan at home")).toEqual(["same as Amrut Snan"])
  })
  it("leaves ordinary devotional copy alone", () => {
    expect(findBannedClaims("Secure payments. Traditionally worn by devotees of Lord Hanuman.", null, "Brass, gold-plated")).toEqual([])
  })
})
