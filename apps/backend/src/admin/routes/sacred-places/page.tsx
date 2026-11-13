import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowDownMini, ArrowUpMini, BuildingStorefront, PencilSquare, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk, uploadFile } from "../../lib/sdk"

type SacredPlace = {
  id: string
  name: string
  location: string
  description: string
  image_url: string | null
  image_credit: string | null
  deity_tag: string | null
  collection_id: string | null
  strip_label: string | null
  rank: number
  visible: boolean
}
type Form = Omit<SacredPlace, "id" | "rank"> & { id?: string }

const NONE = "__none"
const EMPTY: Form = {
  name: "",
  location: "",
  description: "",
  image_url: null,
  image_credit: null,
  deity_tag: null,
  collection_id: null,
  strip_label: null,
  visible: true,
}
const KEY = ["sacred-places"]

const SacredPlacesPage = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [form, setForm] = useState<Form | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => sdk.client.fetch<{ sacred_places: SacredPlace[] }>("/admin/sacred-places"),
  })
  const places = data?.sacred_places ?? []

  // Deity tags ("deity:Shiva") and collections for the link dropdowns.
  const { data: tags } = useQuery({
    queryKey: ["deity-tags"],
    queryFn: () => sdk.admin.productTag.list({ q: "deity:", limit: 100 }),
  })
  const { data: collections } = useQuery({
    queryKey: ["collections-all"],
    queryFn: () => sdk.admin.productCollection.list({ limit: 100 }),
  })
  const deityTags = (tags?.product_tags ?? []).filter((t) => t.value.startsWith("deity:"))

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY })
  const onError = (e: Error) => toast.error(e.message)

  const save = useMutation({
    mutationFn: ({ id, name, location, description, image_url, image_credit, deity_tag, collection_id, strip_label, visible }: Form) =>
      sdk.client.fetch(id ? `/admin/sacred-places/${id}` : "/admin/sacred-places", {
        method: "POST",
        body: { name, location, description, image_url, image_credit, deity_tag, collection_id, strip_label, visible },
      }),
    onSuccess: () => {
      refresh()
      setForm(null)
      toast.success("Sacred place saved")
    },
    onError,
  })

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Form>) =>
      sdk.client.fetch(`/admin/sacred-places/${id}`, { method: "POST", body }),
    onSuccess: refresh,
    onError,
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      sdk.client.fetch("/admin/sacred-places/reorder", { method: "POST", body: { ids } }),
    onSuccess: refresh,
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/sacred-places/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh()
      toast.success("Sacred place deleted")
    },
    onError,
  })

  const move = (index: number, delta: number) => {
    const ids = places.map((p) => p.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id)
    reorder.mutate(ids)
  }

  const onDelete = async (place: SacredPlace) => {
    const ok = await prompt({
      title: `Delete ${place.name}?`,
      description: "It will be removed from the website.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (ok) {
      remove.mutate(place.id)
    }
  }

  const onUpload = async (file?: File) => {
    if (!file || !form) {
      return
    }
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setForm((f) => (f ? { ...f, image_url: url } : f))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const collectionTitle = (id: string | null) =>
    collections?.collections.find((c) => c.id === id)?.title

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Sacred Places</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Shown on the homepage in this order. Use only your own or licensed photos.
          </Text>
        </div>
        <Button size="small" onClick={() => setForm({ ...EMPTY })}>
          Add place
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Image</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Links to</Table.HeaderCell>
            <Table.HeaderCell>Visible</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && (
            <Table.Row>
              <Table.Cell>Loading…</Table.Cell>
            </Table.Row>
          )}
          {places.map((p, i) => (
            <Table.Row key={p.id}>
              <Table.Cell>
                <div className="flex gap-x-1">
                  <IconButton size="small" variant="transparent" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUpMini />
                  </IconButton>
                  <IconButton size="small" variant="transparent" disabled={i === places.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDownMini />
                  </IconButton>
                </div>
              </Table.Cell>
              <Table.Cell>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-10 w-14 rounded object-cover" />
                ) : (
                  <Badge size="2xsmall" color="orange">No image</Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <Text size="small" weight="plus">{p.name}</Text>
                <Text size="xsmall" className="text-ui-fg-subtle">{p.location}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">
                  {[p.deity_tag?.replace("deity:", ""), collectionTitle(p.collection_id)].filter(Boolean).join(" · ") || "–"}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Switch checked={p.visible} onCheckedChange={(visible) => patch.mutate({ id: p.id, visible })} aria-label="Visible" />
              </Table.Cell>
              <Table.Cell>
                <div className="flex justify-end gap-x-1">
                  <IconButton size="small" variant="transparent" onClick={() => setForm({ ...p })} aria-label="Edit">
                    <PencilSquare />
                  </IconButton>
                  <IconButton size="small" variant="transparent" onClick={() => onDelete(p)} aria-label="Delete">
                    <Trash />
                  </IconButton>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Drawer open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{form?.id ? "Edit sacred place" : "Add sacred place"}</Drawer.Title>
          </Drawer.Header>
          {form && (
            <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="sp-name">Name</Label>
                <Input id="sp-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="sp-location">Location</Label>
                <Input id="sp-location" value={form.location} onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="sp-strip">Label on the Sacred Nashik skyline</Label>
                <Input id="sp-strip" placeholder="e.g. Ram Ghat (Ramkund)" maxLength={40} value={form.strip_label ?? ""} onChange={(e) => set("strip_label", e.target.value || null)} />
                <Text size="xsmall" className="text-ui-fg-muted">Empty = listed under "Other sacred places", not on the skyline.</Text>
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="sp-description">Short description (2–3 lines)</Label>
                <Textarea id="sp-description" rows={4} maxLength={600} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small" htmlFor="sp-image">Image</Label>
                {form.image_url && (
                  <div className="flex items-center gap-x-2">
                    <img src={form.image_url} alt="" className="h-20 w-28 rounded object-cover" />
                    <Button size="small" variant="transparent" onClick={() => set("image_url", null)}>Remove</Button>
                  </div>
                )}
                <Input id="sp-image" type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0])} />
                <Text size="xsmall" className="text-ui-fg-muted">
                  Upload only photos you took or have a licence to use. Without an image, the site shows a placeholder.
                </Text>
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" htmlFor="sp-credit">Image credit / source</Label>
                <Input id="sp-credit" placeholder="Photo: your name / licence" value={form.image_credit ?? ""} onChange={(e) => set("image_credit", e.target.value || null)} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Linked deity</Label>
                <Select value={form.deity_tag ?? NONE} onValueChange={(v) => set("deity_tag", v === NONE ? null : v)}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value={NONE}>None</Select.Item>
                    {deityTags.map((t) => (
                      <Select.Item key={t.id} value={t.value}>{t.value.replace("deity:", "")}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small">Linked collection</Label>
                <Select value={form.collection_id ?? NONE} onValueChange={(v) => set("collection_id", v === NONE ? null : v)}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value={NONE}>None</Select.Item>
                    {(collections?.collections ?? []).map((c) => (
                      <Select.Item key={c.id} value={c.id}>{c.title}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <Text size="xsmall" className="text-ui-fg-muted">
                  The card links to the collection if set, otherwise to the deity's products.
                </Text>
              </div>
              <div className="flex items-center gap-x-2">
                <Switch id="sp-visible" checked={form.visible} onCheckedChange={(v) => set("visible", v)} />
                <Label size="small" htmlFor="sp-visible">Visible on the website</Label>
              </div>
            </Drawer.Body>
          )}
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button size="small" variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button
              size="small"
              isLoading={save.isPending || uploading}
              disabled={!form?.name.trim() || !form?.location.trim() || !form?.description.trim()}
              onClick={() => form && save.mutate(form)}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Sacred Places",
  icon: BuildingStorefront,
})

export default SacredPlacesPage
