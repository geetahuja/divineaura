import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Settings = {
  legal_name: string
  brand_name: string
  brand_name_hi: string
  tagline_en: string
  tagline_hi: string
  social_instagram: string | null
  social_facebook: string | null
  social_youtube: string | null
  social_pinterest: string | null
  next_snan_label: string | null
  next_snan_date: string | null
  goda_jal_dispatch_date: string | null
  goda_jal_packer: string | null
  address: string
  state: string
  gstin: string | null
  email: string | null
  phone: string | null
  invoice_prefix: string
  credit_note_prefix: string
  gst_scheme: "regular" | "composition"
  bill_of_supply_prefix: string
  return_window_days: number
  grievance_name: string | null
  grievance_email: string | null
  grievance_phone: string | null
  grievance_ack_hours: number
  grievance_resolve_days: number
}

const FIELDS: { key: keyof Settings; label: string; hint?: string; textarea?: boolean; type?: string; options?: [string, string][] }[] = [
  { key: "legal_name", label: "Legal name", hint: "Printed as the seller on invoices." },
  { key: "brand_name", label: "Brand name", hint: "Shown in the site header, footer, page titles, emails and invoices." },
  { key: "brand_name_hi", label: "Brand name (Hindi)" },
  { key: "tagline_en", label: "Tagline (English)" },
  { key: "tagline_hi", label: "Tagline (Hindi)" },
  { key: "address", label: "Registered address", textarea: true, hint: "One line per row, including PIN code." },
  { key: "state", label: "State", hint: "Decides CGST + SGST (same state) or IGST (other states)." },
  { key: "gstin", label: "GSTIN", hint: "15 characters. Leave blank until registered — invoices show a placeholder in development." },
  { key: "email", label: "Support email" },
  { key: "phone", label: "Support phone" },
  { key: "invoice_prefix", label: "Invoice prefix", hint: "e.g. AS → AS/26-27/00001 (max 16 characters in total)." },
  { key: "credit_note_prefix", label: "Credit note prefix", hint: "e.g. CN → CN/26-27/00001" },
  {
    key: "gst_scheme",
    label: "GST scheme",
    options: [["regular", "Regular (tax invoices, delivery all over India)"], ["composition", "Composition (Bill of Supply, delivery in your state only)"]],
    hint: "Composition: no GST is charged or shown, documents become a Bill of Supply, and checkout accepts only PIN codes in the State above. Switch only when every open order has its invoice.",
  },
  { key: "bill_of_supply_prefix", label: "Bill of Supply prefix", hint: "Composition only, own series, e.g. BOS → BOS/26-27/00001" },
  { key: "return_window_days", label: "Return window (days after delivery)", type: "number", hint: "0 turns returns off." },
  { key: "grievance_name", label: "Grievance Officer – name", hint: "Required by the E-Commerce Rules 2020. Shown on the Grievance page, Contact and in the footer." },
  { key: "grievance_email", label: "Grievance Officer – email", hint: "Blank = support email." },
  { key: "grievance_phone", label: "Grievance Officer – phone", hint: "Blank = support phone." },
  { key: "grievance_ack_hours", label: "Acknowledge complaints within (hours)", type: "number", hint: "The Rules require 48 hours." },
  { key: "grievance_resolve_days", label: "Resolve complaints within (days)", type: "number", hint: "The Rules require one month." },
  { key: "social_instagram", label: "Instagram link", hint: "Full URL. Empty = icon hidden in the footer." },
  { key: "social_facebook", label: "Facebook link" },
  { key: "social_youtube", label: "YouTube link" },
  { key: "social_pinterest", label: "Pinterest link" },
  { key: "next_snan_label", label: "Next Amrut Snan – name", hint: "e.g. \"First Amrut Snan, Nashik\". Shown with a countdown on the homepage Kumbh band. Empty = badge hidden." },
  { key: "next_snan_date", label: "Next Amrut Snan – date", type: "date" },
  { key: "goda_jal_dispatch_date", label: "Goda Jal – dispatches after", type: "date", hint: "Pre-orders show \"Dispatches after [date]\". Empty = ships normally." },
  { key: "goda_jal_packer", label: "Goda Jal – packed by (Legal Metrology)", textarea: true, hint: "Name, full address and licence no. of the licensed packer. Printed on Goda Jal pages as the packer declaration." },
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
      (form.gst_scheme !== data?.settings.gst_scheme &&
      !window.confirm(form.gst_scheme === "composition" ? "Switch to the Composition scheme? New orders get no GST, a Bill of Supply, and delivery only within your state." : "Switch back to Regular GST? New orders get tax invoices and delivery all over India.")
        ? Promise.reject(new Error("Not saved"))
        : sdk.client.fetch<{ settings: Settings; state_code: string | null }>("/admin/business-settings", {
        method: "POST",
        body: {
          ...form,
          return_window_days: Number(form.return_window_days || 0),
          grievance_ack_hours: Number(form.grievance_ack_hours || 48),
          grievance_resolve_days: Number(form.grievance_resolve_days || 30),
        },
      })),
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
          Used on GST invoices, Bills of Supply and credit notes. Invoices already issued keep the details they were issued with.
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
            {f.options ? (
              <select
                id={`bd-${f.key}`}
                className="bg-ui-bg-field shadow-borders-base txt-compact-small h-8 w-full rounded-md px-2"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              >
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : f.textarea ? (
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
