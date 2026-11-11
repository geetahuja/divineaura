// "Delivery by Fri, 14 Nov" — the latest date of the courier's estimate.
export const deliveryBy = (maxDays: number, from = new Date()) => {
  const d = new Date(from)
  d.setDate(d.getDate() + maxDays)
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}
