import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUturnLeft } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, Input, Select, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type Item = { item_id: string; title?: string; quantity: number; amount: number }
type Ret = {
  id: string
  order_id: string
  order_number: number
  status: "requested" | "approved" | "rejected" | "received" | "refunded"
  items: Item[]
  reason: string
  details: string | null
  photos: string[] | null
  refund_amount: number
  refund_method: "original" | "manual"
  payout_hint: string | null
  admin_note: string | null
  pickup_awb: string | null
  pickup_courier: string | null
  created_at: string
  payout?: { method: "upi"; upi_id: string } | { method: "bank"; account_name: string; account_number: string; ifsc: string } | { error: string } | null
}

const COLOR = { requested: "orange", approved: "blue", rejected: "grey", received: "purple", refunded: "green" } as const
const REASON: Record<string, string> = { damaged: "Damaged", wrong_item: "Wrong item", not_as_described: "Not as described", quality: "Quality issue", changed_mind: "Changed mind", other: "Other" }
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [note, setNote] = useState("")
  const [reference, setReference] = useState("")
  const { data } = useQuery({ queryKey: ["return", id], queryFn: () => sdk.client.fetch<{ return: Ret }>(`/admin/returns/${id}`) })
  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: Record<string, unknown> }) => sdk.client.fetch(`/admin/returns/${id}/${action}`, { method: "POST", body: body ?? {} }),
    onSuccess: () => {
      toast.success("Return updated — the customer has been messaged")
      qc.invalidateQueries({ queryKey: ["returns"] })
      qc.invalidateQueries({ queryKey: ["return", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const r = data?.return
  if (!r) return <Drawer.Body>Loading…</Drawer.Body>
  const p = r.payout

  return (
    <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Badge color={COLOR[r.status]}>{r.status}</Badge>
        <Link to={`/orders/${r.order_id}`} className="txt-compact-small text-ui-fg-interactive">Order #{r.order_number}</Link>
      </div>
      <div>
        <Text weight="plus">Items</Text>
        {r.items.map((i) => (
          <Text key={i.item_id} size="small">{i.quantity} × {i.title ?? i.item_id} — {inr(i.amount)}</Text>
        ))}
        <Text size="small" weight="plus" className="mt-1">Refund: {inr(r.refund_amount)} ({r.refund_method === "original" ? "back to the original payment" : "manual — COD order"})</Text>
      </div>
      <div>
        <Text weight="plus">Reason</Text>
        <Text size="small">{REASON[r.reason] ?? r.reason}{r.details ? ` — ${r.details}` : ""}</Text>
      </div>
      {!!r.photos?.length && (
        <div className="flex gap-2">
          {r.photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Return photo" className="h-20 w-20 rounded object-cover" /></a>
          ))}
        </div>
      )}
      {r.pickup_awb && <Text size="small">Reverse pickup: {r.pickup_courier} · AWB {r.pickup_awb}</Text>}
      {r.admin_note && <Text size="small" className="whitespace-pre-line">Note: {r.admin_note}</Text>}

      {r.refund_method === "manual" && r.status !== "refunded" && r.status !== "rejected" && (
        <div className="rounded-md border p-3">
          <Text weight="plus">Pay the refund to</Text>
          {!p ? (
            <Text size="small">No payout details.</Text>
          ) : "error" in p ? (
            <Text size="small" className="text-ui-fg-error">{p.error}</Text>
          ) : p.method === "upi" ? (
            <Text size="small">UPI: <span className="font-mono">{p.upi_id}</span></Text>
          ) : (
            <Text size="small">{p.account_name} · A/c <span className="font-mono">{p.account_number}</span> · IFSC <span className="font-mono">{p.ifsc}</span></Text>
          )}
          <Text size="xsmall" className="text-ui-fg-subtle mt-1">Stored encrypted and deleted as soon as you mark the refund paid.</Text>
        </div>
      )}

      {r.status === "requested" && (
        <div className="flex flex-col gap-2">
          <Textarea placeholder="Note (required to reject — the customer sees it)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ action: "approve", body: { note: note || null } })}>Approve &amp; book pickup</Button>
            <Button size="small" variant="danger" disabled={note.trim().length < 3} isLoading={act.isPending} onClick={() => act.mutate({ action: "reject", body: { note } })}>Reject</Button>
          </div>
        </div>
      )}
      {r.status === "approved" && (
        <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ action: "receive" })}>
          {r.refund_method === "original" ? "Mark received & refund" : "Mark received"}
        </Button>
      )}
      {r.status === "received" && (
        <div className="flex flex-col gap-2">
          {r.refund_method === "manual" && <Input placeholder="UPI / bank reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />}
          <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ action: "refund", body: { reference: reference || null } })}>
            {r.refund_method === "manual" ? `Mark refund of ${inr(r.refund_amount)} paid` : "Retry refund"}
          </Button>
        </div>
      )}
      <Button size="small" variant="secondary" onClick={onClose}>Close</Button>
    </Drawer.Body>
  )
}

// Customer return requests (ARCHITECTURE.md §10, §12).
const ReturnsPage = () => {
  const [status, setStatus] = useState("all")
  const [open, setOpen] = useState<string | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["returns", status],
    queryFn: () => sdk.client.fetch<{ returns: Ret[] }>(`/admin/returns${status === "all" ? "" : `?status=${status}`}`),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Returns</Heading>
          <Text size="small" className="text-ui-fg-subtle">Approve → courier picks up → mark received → refund. Every step messages the customer.</Text>
        </div>
        <div className="w-44">
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              {["all", "requested", "approved", "received", "refunded", "rejected"].map((s) => (
                <Select.Item key={s} value={s}>{s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Requested</Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Items</Table.HeaderCell>
            <Table.HeaderCell>Reason</Table.HeaderCell>
            <Table.HeaderCell>Refund</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.returns ?? []).map((r) => (
            <Table.Row key={r.id} className="cursor-pointer" onClick={() => setOpen(r.id)}>
              <Table.Cell>{new Date(r.created_at).toLocaleDateString("en-IN")}</Table.Cell>
              <Table.Cell>#{r.order_number}</Table.Cell>
              <Table.Cell>{r.items.reduce((n, i) => n + i.quantity, 0)}</Table.Cell>
              <Table.Cell>{REASON[r.reason] ?? r.reason}</Table.Cell>
              <Table.Cell>{inr(r.refund_amount)}{r.refund_method === "manual" ? " (COD)" : ""}</Table.Cell>
              <Table.Cell><Badge size="2xsmall" color={COLOR[r.status]}>{r.status}</Badge></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <div className="px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">{isLoading ? "Loading…" : `${data?.returns.length ?? 0} return(s)`}</Text>
      </div>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Content>
          <Drawer.Header><Drawer.Title>Return</Drawer.Title></Drawer.Header>
          {open && <Detail id={open} onClose={() => setOpen(null)} />}
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Returns", icon: ArrowUturnLeft })
export default ReturnsPage
