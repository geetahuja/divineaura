/** Whole days from today (India time) until a YYYY-MM-DD date; null when unset, malformed or past. */
export function daysUntil(date: string | null | undefined, now = new Date()) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) // YYYY-MM-DD
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  return days >= 0 ? days : null
}
