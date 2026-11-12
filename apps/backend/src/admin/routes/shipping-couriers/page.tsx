import { defineRouteConfig } from "@medusajs/admin-sdk"
import { RocketLaunch } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type View = {
  settings: { default_courier: string; manual_courier_name: string | null; manual_tracking_url: string | null; manual_eta_min: number; manual_eta_max: number }
  couriers: { id: string; label: string }[]
  effective_default: string
  manual_pincodes: { serviceable: number; cod: number }
}

const selectCls = "bg-ui-bg-field shadow-borders-base txt-compact-small h-8 w-full rounded-md px-2"
const field = (label: string, hint: string, input: React.ReactNode) => (
  <div className="flex flex-col gap-y-1">
    <Label size="small">{label}</Label>
    {input}
    <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>
  </div>
)

// Default courier (Shiprocket / manual / test) + the manual courier's details and PIN lists.
const ShippingCouriersPage = () => {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ["courier-settings"], queryFn: () => sdk.client.fetch<View>("/admin/shipping/settings") })
  const { data: pins } = useQuery({ queryKey: ["manual-pincodes"], queryFn: () => sdk.client.fetch<{ serviceable: string; cod: string; count: number }>("/admin/shipping/manual-pincodes") })
  const [form, setForm] = useState({ default_courier: "auto", manual_courier_name: "", manual_tracking_url: "", manual_eta_min: "3", manual_eta_max: "7" })
  const [lists, setLists] = useState({ serviceable: "", cod: "" })
  useEffect(() => {
    if (data) {
      const s = data.settings
      setForm({ default_courier: s.default_courier, manual_courier_name: s.manual_courier_name ?? "", manual_tracking_url: s.manual_tracking_url ?? "", manual_eta_min: String(s.manual_eta_min), manual_eta_max: String(s.manual_eta_max) })
    }
  }, [data])
  useEffect(() => {
    if (pins) setLists({ serviceable: pins.serviceable, cod: pins.cod })
  }, [pins])

  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch<View>("/admin/shipping/settings", {
        method: "POST",
        body: {
          default_courier: form.default_courier,
          manual_courier_name: form.manual_courier_name || null,
          manual_tracking_url: form.manual_tracking_url || null,
          manual_eta_min: Number(form.manual_eta_min),
          manual_eta_max: Number(form.manual_eta_max),
        },
      }),
    onSuccess: (r) => {
      qc.setQueryData(["courier-settings"], r)
      toast.success("Courier settings saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const savePins = useMutation({
    mutationFn: () => sdk.client.fetch<{ serviceable: number; cod: number }>("/admin/shipping/manual-pincodes", { method: "POST", body: lists }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["manual-pincodes"] })
      qc.invalidateQueries({ queryKey: ["courier-settings"] })
      toast.success(`Saved ${r.serviceable} delivery PIN codes (${r.cod} with COD)`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const label = (id: string) => data?.couriers.find((c) => c.id === id)?.label ?? id

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Shipping &amp; couriers</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The default courier answers PIN-code checks on the site and books new shipments. You can pick another one on each order.
            Shiprocket appears once its login is in the server's .env (see GO-LIVE.md).
          </Text>
        </div>
        <form
          className="grid gap-4 px-6 py-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {field(
            "Default courier",
            `Now in use: ${label(data?.effective_default ?? "")}. "Automatic" = Shiprocket when connected, otherwise the test courier (staging) or the manual courier.`,
            <select className={selectCls} value={form.default_courier} onChange={(e) => setForm({ ...form, default_courier: e.target.value })}>
              <option value="auto">Automatic</option>
              {data?.couriers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          <div className="flex items-end gap-2">
            {data?.couriers.map((c) => <Badge key={c.id} size="2xsmall" color={c.id === data.effective_default ? "green" : "grey"}>{c.label}</Badge>)}
          </div>
          <div className="md:col-span-2">
            <Heading level="h2">Manual courier (your own courier tie-up)</Heading>
            <Text size="small" className="text-ui-fg-subtle">You book the parcel with the courier, then enter its AWB on the order. Customers get the tracking link and the usual messages; you update the status on the order.</Text>
          </div>
          {field("Courier name", "Pre-filled on manual shipments, e.g. DTDC.", <Input value={form.manual_courier_name} onChange={(e) => setForm({ ...form, manual_courier_name: e.target.value })} />)}
          {field("Tracking link", "Optional, starts with https://. {awb} is replaced by the AWB number.", <Input placeholder="https://courier.example/track?awb={awb}" value={form.manual_tracking_url} onChange={(e) => setForm({ ...form, manual_tracking_url: e.target.value })} />)}
          {field("Delivery days – from", "Shown as the delivery estimate for these PIN codes.", <Input type="number" min={1} max={30} value={form.manual_eta_min} onChange={(e) => setForm({ ...form, manual_eta_min: e.target.value })} />)}
          {field("Delivery days – to", "", <Input type="number" min={1} max={30} value={form.manual_eta_max} onChange={(e) => setForm({ ...form, manual_eta_max: e.target.value })} />)}
          <div className="md:col-span-2">
            <Button type="submit" isLoading={save.isPending}>Save</Button>
          </div>
        </form>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Manual courier PIN codes</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Paste lists from Excel or the courier's sheet — one per line, or separated by commas or spaces. Saving replaces both lists.
            Now: {data?.manual_pincodes.serviceable ?? 0} delivery PIN codes, {data?.manual_pincodes.cod ?? 0} with Cash on Delivery.
          </Text>
        </div>
        <form
          className="grid gap-4 px-6 py-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            savePins.mutate()
          }}
        >
          {field("Delivers to", "Every PIN code the courier serves.", <Textarea rows={10} value={lists.serviceable} onChange={(e) => setLists({ ...lists, serviceable: e.target.value })} />)}
          {field("Cash on Delivery allowed", "Must also be in the left list. COD is still subject to Admin → COD & payments.", <Textarea rows={10} value={lists.cod} onChange={(e) => setLists({ ...lists, cod: e.target.value })} />)}
          <div className="md:col-span-2">
            <Button type="submit" variant="secondary" isLoading={savePins.isPending}>Save PIN codes</Button>
          </div>
        </form>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Shipping & couriers", icon: RocketLaunch })
export default ShippingCouriersPage
