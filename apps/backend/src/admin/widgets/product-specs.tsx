import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk, uploadFile } from "../lib/sdk"

type Specs = Record<string, string | number | boolean | null>
type SpecsResponse = {
  specs: Specs | null
  gst: { rate: number; name: string; code: string } | null
  gst_override: number | null
}

type Field = {
  key: string
  label: string
  kind: "text" | "textarea" | "number" | "int" | "select" | "file"
  hint?: string
  placeholder?: string
  options?: { value: string; label: string }[]
}

const NONE = "__none"
const STONE_ORIGINS = [
  { value: "natural", label: "Natural" },
  { value: "reconstituted", label: "Reconstituted" },
  { value: "dyed", label: "Dyed" },
  { value: "not_applicable", label: "Not applicable" },
]
const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
]

// ARCHITECTURE.md §4. All optional; stone origin is required once a stone type is set.
const FIELDS: Field[] = [
  { key: "material", label: "Material", kind: "text", placeholder: "Brass, gold-plated" },
  { key: "stone_type", label: "Stone type", kind: "text", placeholder: "Tiger eye", hint: "Leave empty if the product has no stone." },
  { key: "stone_origin", label: "Stone origin", kind: "select", options: STONE_ORIGINS, hint: "Required when a stone type is set. Must be truthful." },
  { key: "bead_size_mm", label: "Bead size (mm)", kind: "number" },
  { key: "bead_count", label: "Bead count", kind: "int" },
  { key: "length_cm", label: "Length (cm)", kind: "number" },
  { key: "dimensions_mm", label: "Dimensions (mm)", kind: "text", placeholder: "25 × 18" },
  { key: "weight_g", label: "Weight (g)", kind: "number" },
  { key: "chain_included", label: "Chain included", kind: "select", options: YES_NO },
  { key: "colour", label: "Colour", kind: "text" },
  { key: "pack_quantity", label: "Pack quantity", kind: "int" },
  { key: "care_instructions", label: "Care instructions", kind: "textarea" },
  { key: "mantra", label: "Mantra", kind: "textarea" },
  { key: "certificate_url", label: "Certificate", kind: "file", hint: "Lab certificate (PDF or image) for gemstones." },
  { key: "country_of_origin", label: "Country of origin", kind: "text", placeholder: "India", hint: "Required by law — shown on the product page." },
  { key: "hsn_code", label: "HSN code", kind: "text", placeholder: "4, 6 or 8 digits" },
  { key: "not_returnable", label: "Not returnable", kind: "select", options: YES_NO, hint: "Yes for items that can't be returned once opened (e.g. sacred threads, malas). Shown on the product page." },
]

const display = (field: Field, value: Specs[string]) => {
  if (value === null || value === undefined || value === "") {
    return "–"
  }
  if (field.kind === "select") {
    return field.options?.find((o) => o.value === String(value))?.label ?? String(value)
  }
  return String(value)
}

// Form keeps strings; convert to API types on save.
const toBody = (form: Record<string, string>) => ({
  // Blank = no product-level rate (inherit product-type override / India default).
  gst_rate: (form.gst_rate ?? "").trim() === "" ? null : Number(form.gst_rate),
  ...Object.fromEntries(
    FIELDS.map((f) => {
      const raw = (form[f.key] ?? "").trim()
      if (!raw || raw === NONE) {
        return [f.key, null]
      }
      if (f.kind === "number" || f.kind === "int") {
        return [f.key, Number(raw)]
      }
      if (f.key === "chain_included" || f.key === "not_returnable") {
        return [f.key, raw === "true"]
      }
      return [f.key, raw]
    })
  ),
})

const ProductSpecsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const queryKey = ["product-specs", product.id]
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sdk.client.fetch<SpecsResponse>(`/admin/products/${product.id}/specs`),
  })

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<SpecsResponse>(`/admin/products/${product.id}/specs`, {
        method: "POST",
        body,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKey, res)
      toast.success("DivineAura details saved")
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEditor = () => {
    const specs = data?.specs ?? {}
    setForm({
      gst_rate: data?.gst_override != null ? String(data.gst_override) : "",
      ...Object.fromEntries(
        FIELDS.map((f) => [f.key, specs[f.key] === null || specs[f.key] === undefined ? "" : String(specs[f.key])])
      ),
    })
    setOpen(true)
  }

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onUpload = async (file?: File) => {
    if (!file) {
      return
    }
    setUploading(true)
    try {
      set("certificate_url", await uploadFile(file))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">DivineAura details</Heading>
          {!isLoading && !data?.specs?.country_of_origin && (
            <Badge size="2xsmall" color="red" title="Required by the Consumer Protection (E-Commerce) Rules 2020">Country of origin missing</Badge>
          )}
        </div>
        <Button size="small" variant="secondary" onClick={openEditor} disabled={isLoading}>
          Edit
        </Button>
      </div>

      <div className="px-6 py-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <Text size="small" weight="plus">GST rate</Text>
        <Text size="small">
          {data?.gst ? `${data.gst.rate}%` : "–"}{" "}
          <span className="text-ui-fg-muted">
            {data?.gst_override != null ? (
              "(set on this product)"
            ) : (
              <>
                (default —{" "}
                <a href="/app/settings/tax-regions" className="text-ui-fg-interactive hover:underline">
                  Tax Regions
                </a>
                )
              </>
            )}
          </span>
        </Text>
        {FIELDS.map((f) => (
          <div key={f.key} className="contents">
            <Text size="small" weight="plus">{f.label}</Text>
            {f.kind === "file" && data?.specs?.[f.key] ? (
              <a
                href={String(data.specs[f.key])}
                target="_blank"
                rel="noreferrer"
                className="txt-small text-ui-fg-interactive hover:underline"
              >
                View certificate
              </a>
            ) : (
              <Text size="small" className="whitespace-pre-line text-ui-fg-subtle">
                {isLoading ? "…" : display(f, data?.specs?.[f.key] ?? null)}
              </Text>
            )}
          </div>
        ))}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>DivineAura details</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor="spec-gst_rate">GST rate (%)</Label>
              <Input
                id="spec-gst_rate"
                type="number"
                step="any"
                min={0}
                max={40}
                placeholder={
                  data?.gst && data.gst_override == null
                    ? `${data.gst.rate} (default)`
                    : "Default"
                }
                value={form.gst_rate ?? ""}
                onChange={(e) => set("gst_rate", e.target.value)}
              />
              <Text size="xsmall" className="text-ui-fg-muted">
                Leave empty to use the default rate. Check the rate for this product's HSN code.
              </Text>
            </div>
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-y-1">
                <Label size="small" htmlFor={`spec-${f.key}`}>{f.label}</Label>
                {f.kind === "textarea" ? (
                  <Textarea id={`spec-${f.key}`} value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.kind === "select" ? (
                  <Select value={form[f.key] || NONE} onValueChange={(v) => set(f.key, v)}>
                    <Select.Trigger id={`spec-${f.key}`}>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value={NONE}>Not set</Select.Item>
                      {f.options!.map((o) => (
                        <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                ) : f.kind === "file" ? (
                  <div className="flex flex-col gap-y-2">
                    {form[f.key] && (
                      <div className="flex items-center gap-x-2">
                        <a href={form[f.key]} target="_blank" rel="noreferrer" className="txt-small text-ui-fg-interactive truncate">
                          {form[f.key].split("/").pop()}
                        </a>
                        <Button size="small" variant="transparent" onClick={() => set(f.key, "")}>Remove</Button>
                      </div>
                    )}
                    <Input
                      id={`spec-${f.key}`}
                      type="file"
                      accept="application/pdf,image/*"
                      disabled={uploading}
                      onChange={(e) => onUpload(e.target.files?.[0])}
                    />
                  </div>
                ) : (
                  <Input
                    id={`spec-${f.key}`}
                    type={f.kind === "number" || f.kind === "int" ? "number" : "text"}
                    step={f.kind === "int" ? 1 : "any"}
                    min={f.kind === "number" || f.kind === "int" ? 0 : undefined}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.hint && <Text size="xsmall" className="text-ui-fg-muted">{f.hint}</Text>}
              </div>
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">Cancel</Button>
            </Drawer.Close>
            <Button size="small" isLoading={save.isPending || uploading} onClick={() => save.mutate(toBody(form))}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductSpecsWidget
