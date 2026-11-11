import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Settings = {
  legal_name: string
  brand_name: string
  address: string
  state: string
  gstin: string | null
  email: string | null
  phone: string | null
  invoice_prefix: string
  credit_note_prefix: string
  return_window_days: number
}

const FIELDS: { key: keyof Settings; label: string; hint?: string; textarea?: boolean; type?: string }[] = [
  { key: "legal_name", label: "Legal name", hint: "Printed as the seller on invoices." },
  { key: "brand_name", label: "Brand name" },
  { key: "address", label: "Registered address", textarea: true, hint: "One line per row, including PIN code." },
  { key: "state", label: "State", hint: "Decides CGST + SGST (same state) or IGST (other states)." },
  { key: "gstin", label: "GSTIN", hint: "15 characters. Leave blank until registered — invoices show a placeholder in development." },
  { key: "email", label: "Support email" },
  { key: "phone", label: "Support phone" },
  { key: "invoice_prefix", label: "Invoice prefix", hint: "e.g. DA → DA/26-27/00001 (max 16 characters in total)." },
  { key: "credit_note_prefix", label: "Credit note prefix", hint: "e.g. CN → CN/26-27/00001" },
  { key: "return_window_days", label: "Return window (days after delivery)", type: "number", hint: "0 turns returns off." },
]

// Seller details for GST invoices + the return window (ARCHITECTURE.md §5 rule 11, §12).
const BusinessDetailsPage = () => {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ["business-settings"], queryFn: () => sdk.client.fetch<{ settings: Settings; state_code: string | null }>("/admin/business-settings") })
  const [form, setForm] = useState<Record<string, string>>({})
  useEffect(() => {
    if (data) setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(data.settings[f.key] ?? "")])))
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ settings: Settings; state_code: string | null }>("/admin/business-settings", {
        method: "POST",
        body: { ...form, return_window_days: Number(form.return_window_days || 0) },
      }),
    onSuccess: (r) => {
      qc.setQueryData(["business-settings"], r)
      toast.success("Business details saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Business details</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Used on GST invoices and credit notes. Invoices already issued keep the details they were issued with.
          {data?.state_code ? ` GST state code: ${data.state_code}.` : ""}
        </Text>
      </div>
      <form
        className="grid gap-4 px-6 py-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        {FIELDS.map((f) => (
          <div key={f.key} className={f.textarea ? "md:col-span-2" : ""}>
            <Label size="small" htmlFor={`bd-${f.key}`}>{f.label}</Label>
            {f.textarea ? (
              <Textarea id={`bd-${f.key}`} rows={3} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : (
              <Input id={`bd-${f.key}`} type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
            {f.hint && <Text size="xsmall" className="text-ui-fg-subtle mt-1">{f.hint}</Text>}
          </div>
        ))}
        <div className="md:col-span-2">
          <Button type="submit" isLoading={save.isPending}>Save</Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Business details", icon: BuildingStorefront })
export default BusinessDetailsPage
