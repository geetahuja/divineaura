import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Star } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, Input, Label, Select, Switch, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type Review = {
  id: string
  product_id: string
  product_title: string
  order_id: string
  order_number: number
  rating: number
  title: string | null
  body: string
  photos: string[]
  display_name: string
  status: "pending" | "approved" | "rejected" | "hidden"
  reject_reason: string | null
  reply: string | null
  incentive_code: string | null
  created_at: string
}
type Settings = {
  request_after_days: number
  min_body_length: number
  blocked_words: string
  incentive_enabled: boolean
  incentive_percent: number
  incentive_requires_photo: boolean
}

const COLOR = { pending: "orange", approved: "green", rejected: "red", hidden: "grey" } as const
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n)

function Detail({ review, onDone }: { review: Review; onDone: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState(review.reject_reason ?? "")
  const [reply, setReply] = useState(review.reply ?? "")
  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body: Record<string, unknown> }) => sdk.client.fetch(`/admin/reviews/${review.id}/${action}`, { method: "POST", body }),
    onSuccess: (_r, v) => {
      toast.success(v.action === "reply" ? "Reply saved" : `Review ${v.action === "approve" ? "approved" : v.action === "reject" ? "rejected" : "hidden"}`)
      qc.invalidateQueries({ queryKey: ["reviews"] })
      if (v.action !== "reply") onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Badge color={COLOR[review.status]}>{review.status}</Badge>
        <Link to={`/orders/${review.order_id}`} className="txt-compact-small text-ui-fg-interactive">Order #{review.order_number}</Link>
        <Link to={`/products/${review.product_id}`} className="txt-compact-small text-ui-fg-interactive">{review.product_title}</Link>
      </div>
      <div>
        <Text className="text-lg text-[#C58A36]">{stars(review.rating)}</Text>
        {review.title && <Text weight="plus">{review.title}</Text>}
        <Text size="small" className="whitespace-pre-line">{review.body}</Text>
        <Text size="xsmall" className="text-ui-fg-subtle mt-1">Shown as “{review.display_name}” · {new Date(review.created_at).toLocaleString("en-IN")}</Text>
        <Text size="xsmall" className="text-ui-fg-subtle">The customer's words and rating can't be edited — approve, reject or hide only.</Text>
      </div>
      {!!review.photos.length && (
        <div className="flex flex-wrap gap-2">
          {review.photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Review photo" className="h-20 w-20 rounded object-cover" /></a>
          ))}
        </div>
      )}
      {review.incentive_code && <Text size="small">Coupon given: <span className="font-mono">{review.incentive_code}</span></Text>}

      <div className="flex flex-col gap-2">
        <Label size="small" htmlFor="rv-reason">Reason (private — only for rejecting or hiding)</Label>
        <Textarea id="rv-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {review.status !== "approved" && (
            <Button size="small" isLoading={act.isPending} onClick={() => act.mutate({ action: "approve", body: {} })}>Approve</Button>
          )}
          {review.status !== "rejected" && (
            <Button size="small" variant="danger" disabled={!reason.trim()} isLoading={act.isPending} onClick={() => act.mutate({ action: "reject", body: { reason } })}>Reject</Button>
          )}
          {review.status === "approved" && (
            <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ action: "hide", body: { reason: reason || null } })}>Hide from site</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <Label size="small" htmlFor="rv-reply">Public reply from DivineAura (shown under the review)</Label>
        <Textarea id="rv-reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
        <Button size="small" variant="secondary" isLoading={act.isPending} onClick={() => act.mutate({ action: "reply", body: { reply } })}>
          {reply.trim() ? "Save reply" : "Remove reply"}
        </Button>
      </div>
    </Drawer.Body>
  )
}

function SettingsPanel() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ["review-settings"], queryFn: () => sdk.client.fetch<{ settings: Settings }>("/admin/review-settings") })
  const [s, setS] = useState<Settings | null>(null)
  useEffect(() => {
    if (data) setS(data.settings)
  }, [data])
  const save = useMutation({
    mutationFn: () => sdk.client.fetch<{ settings: Settings }>("/admin/review-settings", { method: "POST", body: s! }),
    onSuccess: (r) => {
      qc.setQueryData(["review-settings"], r)
      toast.success("Review settings saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (!s) return null
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) })

  return (
    <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
      <div>
        <Label size="small" htmlFor="rs-days">Ask for a review … days after delivery</Label>
        <Input id="rs-days" type="number" value={s.request_after_days} onChange={num("request_after_days")} />
        <Text size="xsmall" className="text-ui-fg-subtle">One message per order, never a reminder.</Text>
      </div>
      <div>
        <Label size="small" htmlFor="rs-min">Minimum review length (characters)</Label>
        <Input id="rs-min" type="number" value={s.min_body_length} onChange={num("min_body_length")} />
      </div>
      <div className="md:col-span-2">
        <Label size="small" htmlFor="rs-words">Blocked words (one per line or comma-separated)</Label>
        <Textarea id="rs-words" rows={3} value={s.blocked_words} onChange={(e) => setS({ ...s, blocked_words: e.target.value })} />
        <Text size="xsmall" className="text-ui-fg-subtle">Reviews containing these can't be submitted (e.g. links, abuse, competitor names).</Text>
      </div>
      <div className="md:col-span-2 flex flex-col gap-2 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Switch id="rs-inc" checked={s.incentive_enabled} onCheckedChange={(v) => setS({ ...s, incentive_enabled: v })} />
          <Label size="small" htmlFor="rs-inc">“Share a review, get a coupon” (off by default)</Label>
        </div>
        <Text size="xsmall" className="text-ui-fg-subtle">
          A single-use coupon is sent only after you approve the review — for any rating — and the review shows “Received a coupon for reviewing”.
        </Text>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-28">
            <Label size="small" htmlFor="rs-pct">Discount %</Label>
            <Input id="rs-pct" type="number" value={s.incentive_percent} onChange={num("incentive_percent")} />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Switch id="rs-photo" checked={s.incentive_requires_photo} onCheckedChange={(v) => setS({ ...s, incentive_requires_photo: v })} />
            <Label size="small" htmlFor="rs-photo">Only for reviews with a photo</Label>
          </div>
        </div>
      </div>
      <div className="md:col-span-2">
        <Button size="small" isLoading={save.isPending} onClick={() => save.mutate()}>Save settings</Button>
      </div>
    </div>
  )
}

// Review moderation (ARCHITECTURE.md §5 rule 10, §12). Nothing goes live without approval.
const ReviewsPage = () => {
  const [status, setStatus] = useState("pending")
  const [rating, setRating] = useState("all")
  const [photos, setPhotos] = useState(false)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<Review | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const params = new URLSearchParams(
    Object.entries({ status: status === "all" ? "" : status, rating: rating === "all" ? "" : rating, photos: photos ? "1" : "", q: search }).filter(([, v]) => v)
  )
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", params.toString()],
    queryFn: () => sdk.client.fetch<{ count: number; reviews: Review[] }>(`/admin/reviews?${params}`),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <div>
          <Heading level="h1">Reviews</Heading>
          <Text size="small" className="text-ui-fg-subtle">Verified buyers only. Every review starts as pending; nothing is published until you approve it.</Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setShowSettings(!showSettings)}>{showSettings ? "Close settings" : "Settings"}</Button>
      </div>
      {showSettings && <SettingsPanel />}
      <form
        className="flex flex-wrap items-end gap-3 px-6 py-4"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <div className="w-36">
          <Label size="small">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              {["pending", "approved", "rejected", "hidden", "all"].map((s) => (
                <Select.Item key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="w-28">
          <Label size="small">Rating</Label>
          <Select value={rating} onValueChange={setRating}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              {["all", "5", "4", "3", "2", "1"].map((r) => (
                <Select.Item key={r} value={r}>{r === "all" ? "Any" : `${r} ★`}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="rv-photos" checked={photos} onCheckedChange={setPhotos} />
          <Label size="small" htmlFor="rv-photos">With photos</Label>
        </div>
        <div className="min-w-48 flex-1">
          <Label size="small">Product or order number</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Rudraksha or 21" />
        </div>
        <Button size="small" type="submit" variant="secondary">Search</Button>
      </form>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Rating</Table.HeaderCell>
            <Table.HeaderCell>Review</Table.HeaderCell>
            <Table.HeaderCell>Photos</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.reviews ?? []).map((r) => (
            <Table.Row key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
              <Table.Cell>{new Date(r.created_at).toLocaleDateString("en-IN")}</Table.Cell>
              <Table.Cell className="max-w-48 truncate">{r.product_title}</Table.Cell>
              <Table.Cell className="text-[#C58A36]">{stars(r.rating)}</Table.Cell>
              <Table.Cell className="max-w-72 truncate">{r.title ? `${r.title} — ` : ""}{r.body}</Table.Cell>
              <Table.Cell>{r.photos.length || "–"}</Table.Cell>
              <Table.Cell><Badge size="2xsmall" color={COLOR[r.status]}>{r.status}</Badge>{r.reply ? " ↩" : ""}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <div className="px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">{isLoading ? "Loading…" : `${data?.count ?? 0} review(s)${(data?.count ?? 0) > 50 ? " — showing 50" : ""}`}</Text>
      </div>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Content>
          <Drawer.Header><Drawer.Title>Review</Drawer.Title></Drawer.Header>
          {open && <Detail key={open.id} review={open} onDone={() => setOpen(null)} />}
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Reviews", icon: Star })
export default ReviewsPage
