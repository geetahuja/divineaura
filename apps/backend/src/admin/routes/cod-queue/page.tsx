import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Phone } from "@medusajs/icons"
import { Button, Container, Heading, Table, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type Row = {
  id: string
  order_id: string
  expires_at: string
  created_at: string
  order: {
    display_id: number
    total: number
    email: string | null
    shipping_address: { first_name: string; last_name: string; phone: string; city: string; postal_code: string } | null
  } | null
}

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`
const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "due now"
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} min`
}

// Pending COD orders, oldest first — call the customer, then Confirm or Cancel.
const CodQueuePage = () => {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const { data, isLoading } = useQuery({
    queryKey: ["cod-queue"],
    queryFn: () => sdk.client.fetch<{ queue: Row[] }>("/admin/cod/queue"),
    refetchInterval: 30_000,
  })
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "confirm" | "cancel" }) =>
      sdk.client.fetch<{ status: string; changed: boolean; order_display_id: number }>(`/admin/cod/orders/${id}/${action}`, {
        method: "POST",
        body: action === "cancel" ? { reason: "cancelled after phone call" } : undefined,
      }),
    onSuccess: (r) => {
      toast.success(r.changed ? `Order #${r.order_display_id} ${r.status}` : `Order #${r.order_display_id} was already ${r.status}`)
      qc.invalidateQueries({ queryKey: ["cod-queue"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const rows = data?.queue ?? []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">COD queue</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Cash on Delivery orders waiting for confirmation. Customers can confirm with their link; confirm here after a
          phone call. Unconfirmed orders are cancelled automatically (see COD &amp; payments).
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Auto-cancel in</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!isLoading && rows.length === 0 && (
            <Table.Row>
              <Table.Cell className="text-ui-fg-muted">No COD orders waiting.</Table.Cell>
            </Table.Row>
          )}
          {rows.map((r) => {
            const a = r.order?.shipping_address
            return (
              <Table.Row key={r.id}>
                <Table.Cell>
                  <Link to={`/orders/${r.order_id}`} className="text-ui-fg-interactive hover:underline">
                    #{r.order?.display_id}
                  </Link>
                  <Text size="xsmall" className="text-ui-fg-muted">{new Date(r.created_at).toLocaleString("en-IN")}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{a ? `${a.first_name} ${a.last_name}` : "—"}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {a?.phone ? <a href={`tel:${a.phone}`} className="hover:underline">{a.phone}</a> : "no phone"} · {a?.city} {a?.postal_code}
                  </Text>
                </Table.Cell>
                <Table.Cell>{r.order ? inr(r.order.total) : "—"}</Table.Cell>
                <Table.Cell>{timeLeft(r.expires_at)}</Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex justify-end gap-x-2">
                    <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ id: r.order_id, action: "confirm" })}>
                      Confirm
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={async () => {
                        if (await prompt({ title: `Cancel order #${r.order?.display_id}?`, description: "The order is cancelled and its stock released. The customer is notified.", confirmText: "Cancel order", cancelText: "Keep" })) {
                          act.mutate({ id: r.order_id, action: "cancel" })
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "COD queue", icon: Phone })

export default CodQueuePage
