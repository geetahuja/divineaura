import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeWishlist } from "./wishlist"

test("login merges the browser wishlist into the account once, account order first", () => {
  assert.deepEqual(mergeWishlist(["prod_a", "prod_b"], ["prod_b", "prod_c"]), ["prod_a", "prod_b", "prod_c"])
  assert.deepEqual(mergeWishlist([], ["prod_x"]), ["prod_x"])
  assert.deepEqual(mergeWishlist(["prod_a"], []), ["prod_a"])
})

test("hearting puts the newest first and the list never exceeds 100", () => {
  assert.deepEqual(mergeWishlist(["prod_a"], ["prod_z"], true), ["prod_z", "prod_a"])
  const many = Array.from({ length: 150 }, (_, i) => `prod_${i}`)
  assert.equal(mergeWishlist(many, ["prod_new"]).length, 100)
})
