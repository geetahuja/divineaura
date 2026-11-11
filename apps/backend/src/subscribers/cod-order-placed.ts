import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { startCodConfirmation } from "../lib/cod-orders"

// COD orders start as "Pending confirmation" and get a signed confirm link
// (ARCHITECTURE.md §5.5). Non-COD orders are ignored.
export default async function codOrderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  await startCodConfirmation(container, event.data.id)
}

export const config: SubscriberConfig = { event: "order.placed" }
