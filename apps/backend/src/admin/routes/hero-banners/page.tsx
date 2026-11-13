import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo, PencilSquare, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk, uploadFile } from "../../lib/sdk"

type Banner = {
  id: string
  title: string
  heading: string
  subheading: string | null
  subheading_hi: string | null
  button_text: string
  button_link: string
  image_desktop_url: string | null
  image_mobile_url: string | null
  image_alt: string | null
  caption: string | null
  starts_at: string | null
  ends_at: string | null
  priority: number
  active: boolean
}
type Form = Omit<Banner, "id"> & { id?: string }

const EMPTY: Form = {
  title: "",
  heading: "",
  subheading: "",
  subheading_hi: "",
  button_text: "Shop now",
  button_link: "/shop",
  image_desktop_url: null,
  image_mobile_url: null,
  image_alt: "",
  caption: "",
  starts_at: null,
  ends_at: null,
  priority: 0,
  active: true,
}
const KEY = ["hero-banners"]

// <input type="datetime-local"> works in the admin's local time (IST); store ISO.
const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"

const status = (b: Banner) => {
  const now = Date.now()
  if (!b.active) return { label: "Off", color: "grey" as const }
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: "Scheduled", color: "blue" as const }
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return { label: "Ended", color: "orange" as const }
  return { label: "Live", color: "green" as const }
}

const HeroBannersPage = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [form, setForm] = useState<Form | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => sdk.client.fetch<{ hero_banners: Banner[] }>("/admin/hero-banners"),
  })
  const banners = data?.hero_banners ?? []
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY })
  const onError = (e: Error) => toast.error(e.message)

  const save = useMutation({
    mutationFn: ({ id, ...body }: Form) =>
      sdk.client.fetch(id ? `/admin/hero-banners/${id}` : "/admin/hero-banners", {
        method: "POST",
        body: {
          ...body,
          subheading: body.subheading || null,
          subheading_hi: body.subheading_hi || null,
          image_alt: body.image_alt || null,
          caption: body.caption || null,
          priority: Number(body.priority) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Banner saved. The homepage updates within a minute.")
      setForm(null)
      refresh()
    },
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/hero-banners/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError,
  })

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const onUpload = async (key: "image_desktop_url" | "image_mobile_url", file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set(key, await uploadFile(file))
    } catch (e) {
      onError(e as Error)
    } finally {
      setUploading(false)
    }
  }

  const imageField = (key: "image_desktop_url" | "image_mobile_url", label: string, hint: string) => (
    <div className="flex flex-col gap-y-1">
      <Label size="small">{label}</Label>
      {form?.[key] && (
        <div className="flex items-center gap-x-2">
          <img src={form[key]!} alt="" className="h-16 rounded border object-cover" />
          <Button size="small" variant="transparent" onClick={() => set(key, null)}>Remove</Button>
        </div>
      )}
      <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(key, e.target.files?.[0])} />
      <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>
    </div>
  )

  const textField = (key: "title" | "heading" | "subheading" | "subheading_hi" | "button_text" | "button_link" | "image_alt" | "caption", label: string, hint?: string) => (
    <div className="flex flex-col gap-y-1">
      <Label size="small" htmlFor={`hb-${key}`}>{label}</Label>
      <Input id={`hb-${key}`} value={(form?.[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} />
      {hint && <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>}
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Hero banners</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The homepage shows every Live banner as slides, highest priority first. Without an image, a slide uses the built-in artwork. With none live, it shows the default hero.
          </Text>
        </div>
        <Button size="small" onClick={() => setForm({ ...EMPTY })}>Add banner</Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Banner</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Schedule</Table.HeaderCell>
            <Table.HeaderCell>Priority</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!isLoading && !banners.length && (
            <Table.Row>
              <Table.Cell className="text-ui-fg-muted">No banners yet.</Table.Cell>
            </Table.Row>
          )}
          {banners.map((b) => {
            const s = status(b)
            return (
              <Table.Row key={b.id}>
                <Table.Cell>
                  <div className="flex items-center gap-x-3">
                    {b.image_desktop_url ? (
                      <img src={b.image_desktop_url} alt="" className="h-10 w-16 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-16 items-center justify-center rounded bg-ui-bg-subtle"><Photo /></div>
                    )}
                    <div>
                      <Text size="small" weight="plus">{b.title}</Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">{b.heading}</Text>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell><Badge color={s.color} size="2xsmall">{s.label}</Badge></Table.Cell>
                <Table.Cell>
                  <Text size="xsmall">{fmt(b.starts_at)} → {fmt(b.ends_at)}</Text>
                </Table.Cell>
                <Table.Cell>{b.priority}</Table.Cell>
                <Table.Cell className="text-right">
                  <IconButton size="small" variant="transparent" aria-label="Edit" onClick={() => setForm({ ...b })}>
                    <PencilSquare />
                  </IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    aria-label="Delete"
                    onClick={async () => {
                      if (await prompt({ title: "Delete banner?", description: `"${b.title}" will be removed.`, confirmText: "Delete", cancelText: "Cancel" })) {
                        remove.mutate(b.id)
                      }
                    }}
                  >
                    <Trash />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>

      <Drawer open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{form?.id ? "Edit banner" : "New banner"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            {textField("title", "Internal name", "Only shown here, e.g. \"Diwali 2026\".")}
            {textField("heading", "Heading")}
            {textField("subheading", "Subheading (optional)", "{{brand}}, {{tagline_en}} and {{tagline_hi}} show the name and taglines from Business details.")}
            {textField("subheading_hi", "Hindi line (optional)", "Shown under the subheading in Devanagari, e.g. {{tagline_hi}} for the Hindi tagline.")}
            <div className="grid grid-cols-2 gap-3">
              {textField("button_text", "Button text")}
              {textField("button_link", "Button link", "Site path, e.g. /collections/diwali")}
            </div>
            {imageField("image_desktop_url", "Desktop image", "Wide, about 2400 × 1000 px, no text in the image (the heading is added on top).")}
            {imageField("image_mobile_url", "Mobile image (optional)", "Tall, about 750 × 900 px. Falls back to the desktop image.")}
            {textField("image_alt", "Image description (for screen readers)")}
            {textField("caption", "Photo caption (optional)", "Small place name with a pin, bottom-left of the photo, e.g. Tapovan, Nashik.")}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="hb-start">Start (optional)</Label>
                <Input id="hb-start" type="datetime-local" value={toLocalInput(form?.starts_at ?? null)} onChange={(e) => set("starts_at", fromLocalInput(e.target.value))} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="hb-end">End (optional)</Label>
                <Input id="hb-end" type="datetime-local" value={toLocalInput(form?.ends_at ?? null)} onChange={(e) => set("ends_at", fromLocalInput(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor="hb-priority">Priority</Label>
              <Input id="hb-priority" type="number" step={1} value={String(form?.priority ?? 0)} onChange={(e) => set("priority", Number(e.target.value))} />
              <Text size="xsmall" className="text-ui-fg-muted">When schedules overlap, the higher number wins.</Text>
            </div>
            <div className="flex items-center gap-x-2">
              <Switch id="hb-active" checked={!!form?.active} onCheckedChange={(v) => set("active", v)} />
              <Label size="small" htmlFor="hb-active">Active</Label>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">Cancel</Button>
            </Drawer.Close>
            <Button size="small" isLoading={save.isPending || uploading} onClick={() => form && save.mutate(form)}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Hero banners",
  icon: Photo,
})

export default HeroBannersPage
