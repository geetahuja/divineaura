// Run: pnpm test
import assert from "node:assert/strict"
import { test } from "node:test"
import { daysUntil } from "./dates"

test("daysUntil counts India calendar days and hides past/unset dates", () => {
  const now = new Date("2026-11-13T20:00:00Z") // 14 Nov, 01:30 IST
  assert.equal(daysUntil("2026-11-14", now), 0)
  assert.equal(daysUntil("2026-11-24", now), 10)
  assert.equal(daysUntil("2026-11-13", now), null)
  assert.equal(daysUntil("", now), null)
  assert.equal(daysUntil("24/11/2026", now), null)
})
