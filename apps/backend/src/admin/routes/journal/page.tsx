import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, PencilSquare, Trash } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, IconButton, Input, Label, Switch, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk, uploadFile } from "../../lib/sdk"

type Article = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  cover_image_alt: string | null
  published: boolean
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
}
type Form = Omit<Article, "id"> & { id?: string }

const EMPTY: Form = { title: "", slug: "", excerpt: "", body: "", cover_image_url: null, cover_image_alt: "", published: false, published_at: null, seo_title: "", seo_description: "" }
const KEY = ["journal"]
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "")

const status = (a: Article) =>
  !a.published ? { label: "Draft", color: "grey" as const } : a.published_at && new Date(a.published_at).getTime() > Date.now() ? { label: "Scheduled", color: "blue" as const } : { label: "Published", color: "green" as const }

// Journal articles (storefront /journal). Body is Markdown: ## headings, **bold**, - lists, [links](/path).
const JournalPage = () => {
  const qc = useQueryClient()
  const prompt = usePrompt()
  const [form, setForm] = useState<Form | null>(null)
  const [uploading, setUploading] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => sdk.client.fetch<{ articles: Article[] }>("/admin/journal") })
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })
  const onError = (e: Error) => toast.error(e.message)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const save = useMutation({
    mutationFn: ({ id, ...b }: Form) =>
      sdk.client.fetch(id ? `/admin/journal/${id}` : "/admin/journal", {
        method: "POST",
        body: { ...b, slug: b.slug || slugify(b.title), published_at: b.published_at || (b.published ? new Date().toISOString() : null) },
      }),
    onSuccess: () => {
      toast.success("Article saved. The site updates within a few minutes.")
      setForm(null)
      refresh()
    },
    onError,
  })
  const remove = useMutation({ mutationFn: (id: string) => sdk.client.fetch(`/admin/journal/${id}`, { method: "DELETE" }), onSuccess: refresh, onError })

  const onUpload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set("cover_image_url", await uploadFile(file))
    } catch (e) {
      onError(e as Error)
    } finally {
      setUploading(false)
    }
  }
  const text = (k: "title" | "slug" | "cover_image_alt" | "seo_title" | "seo_description", label: string, hint?: string) => (
    <div className="flex flex-col gap-y-1">
      <Label size="small" htmlFor={`j-${k}`}>{label}</Label>
      <Input id={`j-${k}`} value={(form?.[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
      {hint && <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>}
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Journal</Heading>
          <Text size="small" className="text-ui-fg-subtle">Articles on /journal. Only Published articles whose publish date has arrived are shown.</Text>
        </div>
        <Button size="small" onClick={() => setForm({ ...EMPTY })}>New article</Button>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Article</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Publish date</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {!isLoading && !data?.articles.length && (
            <Table.Row>
              <Table.Cell className="text-ui-fg-muted">No articles yet.</Table.Cell>
            </Table.Row>
          )}
          {(data?.articles ?? []).map((a) => {
            const s = status(a)
            return (
              <Table.Row key={a.id}>
                <Table.Cell>
                  <Text size="small" weight="plus">{a.title}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">/journal/{a.slug}</Text>
                </Table.Cell>
                <Table.Cell><Badge color={s.color} size="2xsmall">{s.label}</Badge></Table.Cell>
                <Table.Cell><Text size="xsmall">{dateOnly(a.published_at) || "—"}</Text></Table.Cell>
                <Table.Cell className="text-right">
                  <IconButton size="small" variant="transparent" aria-label="Edit" onClick={() => setForm({ ...a })}><PencilSquare /></IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    aria-label="Delete"
                    onClick={async () => {
                      if (await prompt({ title: "Delete article?", description: `"${a.title}" will be removed.`, confirmText: "Delete", cancelText: "Cancel" })) remove.mutate(a.id)
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
            <Drawer.Title>{form?.id ? "Edit article" : "New article"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            {text("title", "Title")}
            {text("slug", "URL slug", "Blank = made from the title. Changing it breaks old links.")}
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor="j-excerpt">Short summary (listing + search results)</Label>
              <Textarea id="j-excerpt" rows={2} maxLength={400} value={form?.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor="j-body">Article (Markdown)</Label>
              <Textarea id="j-body" rows={16} value={form?.body ?? ""} onChange={(e) => set("body", e.target.value)} />
              <Text size="xsmall" className="text-ui-fg-muted">## Heading · **bold** · - list item · [link text](/shop). Describe beliefs and traditions; never promise results.</Text>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small">Cover image</Label>
              {form?.cover_image_url && (
                <div className="flex items-center gap-x-2">
                  <img src={form.cover_image_url} alt="" className="h-16 rounded border object-cover" />
                  <Button size="small" variant="transparent" onClick={() => set("cover_image_url", null)}>Remove</Button>
                </div>
              )}
              <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0])} />
              <Text size="xsmall" className="text-ui-fg-muted">About 1600 × 900 px, no text in the image.</Text>
            </div>
            {text("cover_image_alt", "Cover image description (screen readers)")}
            {text("seo_title", "SEO title (optional, ≤ 70 characters)")}
            {text("seo_description", "SEO description (optional, ≤ 170 characters)")}
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor="j-date">Publish date</Label>
              <Input id="j-date" type="date" value={dateOnly(form?.published_at ?? null)} onChange={(e) => set("published_at", e.target.value ? new Date(`${e.target.value}T06:00:00+05:30`).toISOString() : null)} />
              <Text size="xsmall" className="text-ui-fg-muted">Blank = today when you publish. A future date schedules the article.</Text>
            </div>
            <div className="flex items-center gap-x-2">
              <Switch id="j-pub" checked={!!form?.published} onCheckedChange={(v) => set("published", v)} />
              <Label size="small" htmlFor="j-pub">Published</Label>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">Cancel</Button>
            </Drawer.Close>
            <Button size="small" isLoading={save.isPending || uploading} disabled={!form?.title.trim() || !form?.body.trim()} onClick={() => form && save.mutate(form)}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Journal", icon: DocumentText })
export default JournalPage
