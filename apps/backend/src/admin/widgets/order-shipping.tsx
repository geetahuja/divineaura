import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Input, Select, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../lib/sdk"

type Overview = {
  courier: "test" | "shiprocket" | "manual" | null
  default_courier: string
  couriers: { id: string; label: string }[]
  manual_defaults: { courier_name: string | null; tracking_url_template: string | null }
  pickup_ready: boolean
  weight_g: number
  liquid_fragile?: boolean
  is_cod: boolean
  cod_ready: boolean
  cancelled: boolean
  shipment: { awb: string; courier: string; courier_name: string | null; label_url: string | null; tracking_url: string | null } | null
  options: { serviceable: boolean; options: { id: string; name: string; rate: number; etaDays: number; cod: boolean }[]; recommendedId: string | null } | null
  events: { status: string; occurred_at: string; source: string; note: string | null }[]
}

const LABEL: Record<string, string> = {
  placed: "Placed", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for delivery", delivered: "Delivered", rto: "RTO (returned)", cancelled: "Cancelled",
  return_requested: "Return requested", returned: "Returned", refunded: "Refunded",
}
const RECOMMENDED = "__recommended"

// Order page: courier shipment (create, AWB, label), Mark packed, and the customer timeline.
const OrderShippingWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const qc = useQueryClient()
  const key = ["order-shipping", order.id]
  const [courierId, setCourierId] = useState(RECOMMENDED)
  const [provider, setProvider] = useState<string | null>(null) // null = default courier
  const [manual, setManual] = useState({ courier_name: "", awb: "", tracking_url: "" })
  const { data } = useQuery({
    queryKey: [...key, provider],
    queryFn: () => sdk.client.fetch<Overview>(`/admin/shipping/orders/${order.id}`, { query: provider ? { courier: provider } : {} }),
  })

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
      : !data.pickup_ready
          ? "Set the warehouse PIN code and address in Settings → Locations."
          : null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">Shipping &amp; timeline</Heading>
          {(() => {
            const id = data.shipment?.courier ?? data.courier
            const name = data.couriers.find((c) => c.id === id)?.label ?? id
            return id ? <Badge size="2xsmall" color={id === "test" ? "orange" : id === "manual" ? "purple" : "blue"}>{name}</Badge> : null
          })()}
        </div>
        <div className="flex items-center gap-x-3">
          <Link to={`/message-log?order=${order.display_id}`} className="txt-compact-small text-ui-fg-interactive">Messages</Link>
          <Text size="small" className="text-ui-fg-subtle">{(data.weight_g / 1000).toFixed(2)} kg</Text>
        </div>
      </div>

      {data.liquid_fragile && (
        <div className="px-6 py-3">
          <Badge color="orange" size="small">Liquid – fragile</Badge>
          <Text size="small" className="mt-1 text-ui-fg-subtle">This order has a liquid / breakable item (e.g. Goda Jal). Seal the cap, pack upright with cushioning and mark the box "Fragile – Liquid".</Text>
        </div>
      )}
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
              {data.shipment.courier === "manual" && !terminal && (
                <>
                  {(["out_for_delivery", "delivered", "rto"] as const)
                    .filter((s) => !done.includes(s))
                    .map((s) => (
                      <Button key={s} size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "status", body: { status: s } })}>
                        Mark {LABEL[s].toLowerCase()}
                      </Button>
                    ))}
                </>
              )}
              {data.shipment.courier === "test" && !terminal && (
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
            {data.couriers.length > 1 && (
              <div className="min-w-[200px]">
                <Select value={provider ?? data.default_courier} onValueChange={(v) => { setProvider(v === data.default_courier ? null : v); setCourierId(RECOMMENDED) }}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    {data.couriers.map((c) => (
                      <Select.Item key={c.id} value={c.id}>{c.label}{c.id === data.default_courier ? " (default)" : ""}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            )}
            {data.courier === "manual" ? (
              <>
                <Input size="small" className="w-36" placeholder={data.manual_defaults.courier_name ?? "Courier name"} value={manual.courier_name} onChange={(e) => setManual({ ...manual, courier_name: e.target.value })} />
                <Input size="small" className="w-40" placeholder="AWB / tracking no." value={manual.awb} onChange={(e) => setManual({ ...manual, awb: e.target.value })} />
                <Input size="small" className="w-64" placeholder={data.manual_defaults.tracking_url_template ? "Tracking link (default from settings)" : "Tracking link https://…"} value={manual.tracking_url} onChange={(e) => setManual({ ...manual, tracking_url: e.target.value })} />
                {!done.includes("packed") && (
                  <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "packed" })}>Mark packed</Button>
                )}
                <Button
                  size="small"
                  isLoading={act.isPending}
                  disabled={!manual.awb.trim()}
                  onClick={() => act.mutate({ path: "shipment", body: { provider: "manual", manual: { courier_name: manual.courier_name || null, awb: manual.awb, tracking_url: manual.tracking_url || null } } })}
                >
                  Mark shipped
                </Button>
                {data.options?.serviceable === false && <Text size="xsmall" className="text-ui-fg-subtle w-full">This PIN code isn't in the manual courier's list — shipping anyway is allowed.</Text>}
              </>
            ) : data.options?.serviceable === false ? (
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
                  onClick={() => act.mutate({ path: "shipment", body: { provider: data.courier, courier_id: courierId === RECOMMENDED ? null : courierId } })}
                >
                  Create shipment
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Prepaid parcel came back undelivered (RTO): refund by cause (Shipping policy). */}
      {done.includes("rto") && !data.is_cod && !done.includes("refunded") && (
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <Text size="small" weight="plus">Parcel returned undelivered — refund the customer</Text>
          <div className="flex flex-wrap gap-2">
            <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ path: "undelivered-refund", body: { cause: "courier_failed" } })}>
              Courier failed · full refund
            </Button>
            <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "undelivered-refund", body: { cause: "customer_refused" } })}>
              Customer refused · minus shipping
            </Button>
            <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ path: "undelivered-refund", body: { cause: "wrong_address" } })}>
              Wrong address · minus shipping
            </Button>
          </div>
          <Text size="xsmall" className="text-ui-fg-subtle">Refunds through the payment provider once; a credit note and the refund message follow automatically.</Text>
        </div>
      )}

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
