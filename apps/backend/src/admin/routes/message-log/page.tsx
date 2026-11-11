import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Container, Heading, Input, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type Msg = {
  id: string
  event: string
  channel: string
  recipient: string
  status: "sending" | "sent" | "failed" | "skipped"
  provider: string | null
  provider_message_id: string | null
  error: string | null
  order_number: number | null
  created_at: string
}

const COLOR = { sent: "green", failed: "red", sending: "orange", skipped: "grey" } as const

// Every SMS / WhatsApp / email sent (ARCHITECTURE.md §19). Recipients are masked; OTP codes are never stored.
const MessageLogPage = () => {
  const [params, setParams] = useSearchParams()
  const [order, setOrder] = useState(params.get("order") ?? "")
  const [phone, setPhone] = useState(params.get("phone") ?? "")
  const qs = new URLSearchParams(Object.entries({ order: params.get("order") ?? "", phone: params.get("phone") ?? "" }).filter(([, v]) => v))
  const { data, isLoading } = useQuery({
    queryKey: ["message-log", qs.toString()],
    queryFn: () => sdk.client.fetch<{ count: number; messages: Msg[] }>(`/admin/message-log?${qs}`),
  })
  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    setParams(Object.fromEntries(Object.entries({ order, phone }).filter(([, v]) => v.trim())))
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Message log</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          SMS, WhatsApp and emails sent to customers. "console" means the message was printed in the server log (no provider connected yet).
        </Text>
      </div>
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3 px-6 py-4">
        <div>
          <Text size="small" weight="plus">Order number</Text>
          <Input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="e.g. 15" />
        </div>
        <div>
          <Text size="small" weight="plus">Mobile</Text>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="last digits" />
        </div>
        <button type="submit" className="txt-compact-small-plus rounded-md border px-3 py-1.5">Filter</button>
      </form>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Time</Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Event</Table.HeaderCell>
            <Table.HeaderCell>Channel</Table.HeaderCell>
            <Table.HeaderCell>To</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Provider / ID</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.messages ?? []).map((m) => (
            <Table.Row key={m.id}>
              <Table.Cell>{new Date(m.created_at).toLocaleString("en-IN")}</Table.Cell>
              <Table.Cell>{m.order_number ? `#${m.order_number}` : "—"}</Table.Cell>
              <Table.Cell>{m.event}</Table.Cell>
              <Table.Cell>{m.channel}</Table.Cell>
              <Table.Cell>{m.recipient}</Table.Cell>
              <Table.Cell>
                <Badge color={COLOR[m.status]} size="2xsmall" title={m.error ?? undefined}>{m.status}</Badge>
              </Table.Cell>
              <Table.Cell>{[m.provider, m.provider_message_id].filter(Boolean).join(" · ") || "—"}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <div className="px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          {isLoading ? "Loading…" : `${data?.count ?? 0} message(s)${(data?.count ?? 0) > 50 ? " — showing the latest 50" : ""}`}
        </Text>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Message log", icon: ChatBubbleLeftRight })
export default MessageLogPage
