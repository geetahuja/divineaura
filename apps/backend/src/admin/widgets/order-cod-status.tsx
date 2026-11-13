import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type Confirmation = {
  status: "pending" | "confirmed" | "cancelled"
  expires_at: string
  confirmed_at: string | null
  confirmed_by: "customer" | "admin" | null
  cancelled_at: string | null
  cancel_reason: string | null
}

const BADGE = {
  pending: { color: "orange" as const, label: "Pending confirmation" },
  confirmed: { color: "green" as const, label: "Confirmed" },
  cancelled: { color: "red" as const, label: "Cancelled" },
}
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN") : "")

// Top of the admin order page: makes COD orders and their confirmation status unmistakable.
const OrderCodStatusWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const key = ["order-cod", order.id]
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => sdk.client.fetch<{ confirmation: Confirmation | null }>(`/admin/cod/orders/${order.id}`),
  })
  const act = useMutation({
    mutationFn: (action: "confirm" | "cancel") =>
      sdk.client.fetch(`/admin/cod/orders/${order.id}/${action}`, {
        method: "POST",
        body: action === "cancel" ? { reason: "cancelled by the seller" } : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries()
      toast.success("Updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const c = data?.confirmation
  if (!c) return null
  const b = BADGE[c.status]

  return (
    <Container className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">Cash on Delivery</Heading>
          <Badge size="2xsmall" color={b.color}>{b.label}</Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          {c.status === "pending" && `Auto-cancels at ${when(c.expires_at)} if not confirmed. Collect cash on delivery.`}
          {c.status === "confirmed" && `Confirmed by ${c.confirmed_by} on ${when(c.confirmed_at)}. Collect cash on delivery.`}
          {c.status === "cancelled" && `Cancelled on ${when(c.cancelled_at)}${c.cancel_reason ? ` — ${c.cancel_reason}` : ""}.`}
        </Text>
      </div>
      {c.status === "pending" && (
        <div className="flex gap-x-2">
          <Button size="small" isLoading={act.isPending} onClick={() => act.mutate("confirm")}>Confirm (phone)</Button>
          <Button
            size="small"
            variant="danger"
            onClick={async () => {
              if (await prompt({ title: "Cancel this COD order?", description: "The order is cancelled and its stock released.", confirmText: "Cancel order", cancelText: "Keep" })) act.mutate("cancel")
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.before" })

export default OrderCodStatusWidget
