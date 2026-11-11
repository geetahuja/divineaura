import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/sdk"

type Overview = {
  courier: "test" | "shiprocket" | null
  pickup_ready: boolean
  weight_g: number
  is_cod: boolean
  cod_ready: boolean
  cancelled: boolean
  shipment: { awb: string; courier_name: string | null; label_url: string | null; tracking_url: string | null } | null
  options: { serviceable: boolean; options: { id: string; name: string; rate: number; etaDays: number; cod: boolean }[]; recommendedId: string | null } | null
  events: { status: string; occurred_at: string; source: string; note: string | null }[]
}

const LABEL: Record<string, string> = {
  placed: "Placed", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for delivery", delivered: "Delivered", rto: "RTO (returned)", cancelled: "Cancelled",
}
const RECOMMENDED = "__recommended"

// Order page: courier shipment (create, AWB, label), Mark packed, and the customer timeline.
const OrderShippingWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const qc = useQueryClient()
  const key = ["order-shipping", order.id]
  const [courierId, setCourierId] = useState(RECOMMENDED)
  const { data } = useQuery({ queryKey: key, queryFn: () => sdk.client.fetch<Overview>(`/admin/shipping/orders/${order.id}`) })

  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: Record<string, unknown> }) =>
      sdk.client.fetch(`/admin/shipping/orders/${order.id}/${path}`, { method: "POST", body }),
    onSuccess: () => {
      // Tracking webhooks are processed right away; refresh shortly after.
      setTimeout(() => qc.invalidateQueries(), 800)
      toast.success("Updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!data) return null
  const done = data.events.map((e) => e.status)
  const terminal = done.some((s) => ["delivered", "rto", "cancelled"].includes(s))
  const blockedReason = data.cancelled
    ? "Order is cancelled."
    : !data.cod_ready
      ? "Cash on Delivery order — confirm it first (COD queue or customer link)."
      : !data.courier
        ? "No courier configured. Add Shiprocket credentials to .env."
        : !data.pickup_ready
          ? "Set the warehouse PIN code and address in Settings → Locations."
          : null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">Shipping &amp; timeline</Heading>
          {data.courier && <Badge size="2xsmall" color={data.courier === "test" ? "orange" : "blue"}>{data.courier === "test" ? "Test courier" : "Shiprocket"}</Badge>}
        </div>
        <Text size="small" className="text-ui-fg-subtle">{(data.weight_g / 1000).toFixed(2)} kg</Text>
      </div>

      <div className="px-6 py-4">
        {data.shipment ? (
          <div className="flex flex-col gap-y-2">
            <Text size="small">
              <b>{data.shipment.courier_name}</b> · AWB <span className="font-mono">{data.shipment.awb}</span>
            </Text>
            <div className="flex flex-wrap gap-2">
              {data.shipment.label_url && (
                <Button size="small" variant="secondary" onClick={() => window.open(data.shipment!.label_url!, "_blank")}>Download label</Button>
              )}
              {data.shipment.tracking_url && (
                <Button size="small" variant="transparent" onClick={() => window.open(data.shipment!.tracking_url!, "_blank")}>Track</Button>
              )}
              {data.courier === "test" && !terminal && (
                <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "simulate", body: {} })}>
                  Simulate next tracking event
                </Button>
              )}
            </div>
          </div>
        ) : blockedReason ? (
          <Text size="small" className="text-ui-fg-subtle">{blockedReason}</Text>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            {data.options?.serviceable === false ? (
              <Text size="small" className="text-ui-fg-error">The courier does not deliver to this PIN code.</Text>
            ) : (
              <>
                <div className="min-w-[260px]">
                  <Select value={courierId} onValueChange={setCourierId}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value={RECOMMENDED}>Recommended courier</Select.Item>
                      {(data.options?.options ?? []).map((o) => (
                        <Select.Item key={o.id} value={o.id}>
                          {o.name} · ₹{o.rate} · ~{o.etaDays} days{data.is_cod && !o.cod ? " · no COD" : ""}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                {!done.includes("packed") && (
                  <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "packed" })}>Mark packed</Button>
                )}
                <Button
                  size="small"
                  isLoading={act.isPending}
                  onClick={() => act.mutate({ path: "shipment", body: { courier_id: courierId === RECOMMENDED ? null : courierId } })}
                >
                  Create shipment
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <ol className="flex flex-col gap-y-2 px-6 py-4">
        {data.events.length === 0 && <Text size="small" className="text-ui-fg-muted">No timeline yet.</Text>}
        {data.events.map((e) => (
          <li key={e.status} className="flex items-baseline justify-between gap-x-4">
            <Text size="small" weight="plus">{LABEL[e.status] ?? e.status}</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {new Date(e.occurred_at).toLocaleString("en-IN")} · {e.source}{e.note ? ` · ${e.note}` : ""}
            </Text>
          </li>
        ))}
      </ol>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.after" })

export default OrderShippingWidget
