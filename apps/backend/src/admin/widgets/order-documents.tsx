import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type Doc = { number: string; url: string; amount?: number }

// GST invoice + credit notes for the order (PDF links open in a new tab).
const OrderDocumentsWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const { data, isLoading } = useQuery({
    queryKey: ["order-documents", order.id],
    queryFn: () => sdk.client.fetch<{ invoice: Doc | null; credit_notes: Doc[] }>(`/admin/orders/${order.id}/documents`),
  })
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Invoice &amp; credit notes</Heading>
      </div>
      <div className="flex flex-col gap-2 px-6 py-4">
        {isLoading ? (
          <Text size="small">Loading…</Text>
        ) : data?.invoice ? (
          <a href={data.invoice.url} target="_blank" rel="noreferrer" className="txt-compact-small-plus text-ui-fg-interactive">
            Download invoice {data.invoice.number}
          </a>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">Issued once the order is paid (online) or confirmed (COD).</Text>
        )}
        {data?.credit_notes.map((n) => (
          <a key={n.number} href={n.url} target="_blank" rel="noreferrer" className="txt-compact-small text-ui-fg-interactive">
            Credit note {n.number} · ₹{n.amount?.toLocaleString("en-IN")}
          </a>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.side.after" })
export default OrderDocumentsWidget
