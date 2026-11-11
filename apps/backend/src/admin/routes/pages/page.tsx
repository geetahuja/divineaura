import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Badge, Button, Container, Drawer, Heading, Input, Label, Switch, Table, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Row = { slug: string; title: string; path: string; published: boolean; draft: boolean; updated_at: string }
type Faq = { q: string; a: string }
type Full = { slug: string; title: string; body: string; faq: Faq[] | null; seo_title: string | null; seo_description: string | null; published: boolean; path: string }

const STOREFRONT = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_STOREFRONT_URL ?? "http://localhost:8000"

function Editor({ slug, onClose }: { slug: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ["page", slug], queryFn: () => sdk.client.fetch<{ page: Full; placeholders: Record<string, string> }>(`/admin/pages/${slug}`) })
  const [p, setP] = useState<Full | null>(null)
  const [preview, setPreview] = useState("")
  useEffect(() => {
    if (data) setP(data.page)
  }, [data])

  // Live preview (debounced) with the same rendering + live values as the storefront.
  useEffect(() => {
    if (!p) return
    const t = setTimeout(() => {
      sdk.client
        .fetch<{ html: string }>("/admin/page-preview", { method: "POST", body: { body: p.body } })
        .then((r) => setPreview(r.html))
        .catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [p?.body])

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/pages/${slug}`, {
        method: "POST",
        body: { title: p!.title, body: p!.body, faq: p!.faq, seo_title: p!.seo_title, seo_description: p!.seo_description, published: p!.published },
      }),
    onSuccess: () => {
      toast.success("Page saved — live on the site within a minute")
      qc.invalidateQueries({ queryKey: ["pages"] })
      qc.invalidateQueries({ queryKey: ["page", slug] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (!p || !data) return <Drawer.Body>Loading…</Drawer.Body>
  const set = (k: keyof Full, v: unknown) => setP({ ...p, [k]: v })
  const faq = p.faq ?? []

  return (
    <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        <Switch id="pg-pub" checked={p.published} onCheckedChange={(v) => set("published", v)} />
        <Label htmlFor="pg-pub">Published</Label>
        <a href={`${STOREFRONT}${p.path}`} target="_blank" rel="noreferrer" className="txt-compact-small text-ui-fg-interactive">View on site ↗</a>
      </div>
      <div>
        <Label size="small" htmlFor="pg-title">Title (the page heading)</Label>
        <Input id="pg-title" value={p.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label size="small" htmlFor="pg-body">Text</Label>
          <Textarea id="pg-body" rows={22} className="font-mono text-xs" value={p.body} onChange={(e) => set("body", e.target.value)} />
          <Text size="xsmall" className="text-ui-fg-subtle mt-1">
            ## Heading · ### Subheading · **bold** · *italic* · - list · 1. list · [link text](/policies/shipping) · &gt; note · --- line
          </Text>
        </div>
        <div>
          <Label size="small">Preview</Label>
          <div className="prose-sm max-h-[520px] overflow-y-auto rounded-md border p-3 text-sm [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc [&_a]:text-ui-fg-interactive [&_aside]:rounded [&_aside]:bg-ui-bg-subtle [&_aside]:p-2" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      </div>

      {p.slug === "faq" && (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <Text weight="plus">Questions and answers</Text>
          {faq.map((f, i) => (
            <div key={i} className="flex flex-col gap-1 border-b pb-3">
              <Input aria-label={`Question ${i + 1}`} value={f.q} onChange={(e) => set("faq", faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <Textarea aria-label={`Answer ${i + 1}`} rows={3} value={f.a} onChange={(e) => set("faq", faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <div className="flex gap-2">
                <Button size="small" variant="secondary" disabled={i === 0} onClick={() => set("faq", faq.map((x, j) => (j === i - 1 ? faq[i] : j === i ? faq[i - 1] : x)))}>↑</Button>
                <Button size="small" variant="secondary" disabled={i === faq.length - 1} onClick={() => set("faq", faq.map((x, j) => (j === i + 1 ? faq[i] : j === i ? faq[i + 1] : x)))}>↓</Button>
                <Button size="small" variant="danger" onClick={() => set("faq", faq.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            </div>
          ))}
          <Button size="small" variant="secondary" onClick={() => set("faq", [...faq, { q: "New question?", a: "Answer." }])}>+ Add question</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label size="small" htmlFor="pg-seo-t">SEO title ({(p.seo_title ?? "").length}/60)</Label>
          <Input id="pg-seo-t" value={p.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
        </div>
        <div>
          <Label size="small" htmlFor="pg-seo-d">SEO description ({(p.seo_description ?? "").length}/160)</Label>
          <Textarea id="pg-seo-d" rows={2} value={p.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
        </div>
      </div>

      <details className="rounded-md border p-3">
        <summary className="txt-compact-small-plus cursor-pointer">Placeholders (filled from live settings)</summary>
        <div className="mt-2 grid gap-1 md:grid-cols-2">
          {Object.entries(data.placeholders).map(([k, v]) => (
            <Text key={k} size="xsmall"><span className="font-mono">{`{{${k}}}`}</span> → {v}</Text>
          ))}
        </div>
      </details>

      <div className="flex gap-2">
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Drawer.Body>
  )
}

// Content pages: About, Contact, FAQ and policies (ARCHITECTURE.md §6).
const PagesPage = () => {
  const [open, setOpen] = useState<string | null>(null)
  const { data } = useQuery({ queryKey: ["pages"], queryFn: () => sdk.client.fetch<{ pages: Row[] }>("/admin/pages") })
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Pages</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          About, Contact, FAQ and policies. Numbers like {"{{cod_fee}}"} come from your live settings. Pages marked “Draft” still contain the “DRAFT – owner to review” line.
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Page</Table.HeaderCell>
            <Table.HeaderCell>Address</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Updated</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.pages ?? []).map((p) => (
            <Table.Row key={p.slug} className="cursor-pointer" onClick={() => setOpen(p.slug)}>
              <Table.Cell>{p.title}</Table.Cell>
              <Table.Cell className="font-mono text-xs">{p.path}</Table.Cell>
              <Table.Cell>
                {!p.published ? <Badge size="2xsmall" color="grey">Hidden</Badge> : p.draft ? <Badge size="2xsmall" color="orange">Draft text</Badge> : <Badge size="2xsmall" color="green">Live</Badge>}
              </Table.Cell>
              <Table.Cell>{new Date(p.updated_at).toLocaleDateString("en-IN")}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Content className="md:max-w-5xl">
          <Drawer.Header><Drawer.Title>Edit page</Drawer.Title></Drawer.Header>
          {open && <Editor key={open} slug={open} onClose={() => setOpen(null)} />}
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Pages", icon: DocumentText })
export default PagesPage
