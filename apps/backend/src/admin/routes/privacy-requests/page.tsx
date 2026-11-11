import { defineRouteConfig } from "@medusajs/admin-sdk"
import { LockClosedSolid } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Req = { id: string; kind: string; name: string; email: string | null; phone: string | null; details: string | null; status: "open" | "done" | "rejected"; admin_note: string | null; created_at: string }
const KIND: Record<string, string> = { delete_data: "Delete my data", access_data: "Copy of my data", correct_data: "Correct my data" }
const COLOR = { open: "orange", done: "green", rejected: "grey" } as const

// DPDP Act requests from the privacy page. Handle each by hand: verify the person,
// delete/anonymise what you can (account, addresses, marketing consent, reviews),
// keep what the law requires (GST invoices, order records), then mark it done with a note.
const PrivacyRequestsPage = () => {
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const { data } = useQuery({ queryKey: ["privacy-requests"], queryFn: () => sdk.client.fetch<{ requests: Req[] }>("/admin/privacy-requests") })
  const act = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => sdk.client.fetch(`/admin/privacy-requests/${id}`, { method: "POST", body: { status, admin_note: notes[id] || null } }),
    onSuccess: () => {
      toast.success("Request updated")
      qc.invalidateQueries({ queryKey: ["privacy-requests"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Privacy requests</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          From the privacy page. Verify the customer, delete or correct what you can, keep invoices and order records required by GST law, then mark done with a note of what you did.
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Received</Table.HeaderCell>
            <Table.HeaderCell>Request</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Details</Table.HeaderCell>
            <Table.HeaderCell>Status / note</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.requests ?? []).map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>{new Date(r.created_at).toLocaleDateString("en-IN")}</Table.Cell>
              <Table.Cell>{KIND[r.kind] ?? r.kind}</Table.Cell>
              <Table.Cell>{r.name}<br /><span className="text-ui-fg-subtle">{[r.email, r.phone].filter(Boolean).join(" · ")}</span></Table.Cell>
              <Table.Cell className="max-w-64 whitespace-pre-line">{r.details ?? "—"}</Table.Cell>
              <Table.Cell>
                <Badge size="2xsmall" color={COLOR[r.status]}>{r.status}</Badge>
                {r.status === "open" ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <Textarea rows={2} placeholder="What you did (kept for your records)" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="small" onClick={() => act.mutate({ id: r.id, status: "done" })}>Mark done</Button>
                      <Button size="small" variant="secondary" onClick={() => act.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
                    </div>
                  </div>
                ) : (
                  r.admin_note && <Text size="xsmall" className="mt-1">{r.admin_note}</Text>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {!data?.requests.length && <Text size="small" className="px-6 py-4 text-ui-fg-subtle">No requests yet.</Text>}
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Privacy requests", icon: LockClosedSolid })
export default PrivacyRequestsPage
