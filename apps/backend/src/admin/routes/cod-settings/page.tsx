import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar, Trash } from "@medusajs/icons"
import { Badge, Button, Container, Heading, IconButton, Input, Label, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Settings = {
  cod_enabled: boolean
  cod_fee: number
  cod_max_order_value: number
  prepaid_discount_percent: number
  cod_confirm_minutes: number
}

const field = (label: string, hint: string, input: React.ReactNode) => (
  <div className="flex flex-col gap-y-1">
    <Label size="small">{label}</Label>
    {input}
    <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>
  </div>
)

const CodSettingsPage = () => {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: () => sdk.client.fetch<{ settings: Settings }>("/admin/payment-settings"),
  })
  const { data: block } = useQuery({
    queryKey: ["cod-blocklist"],
    queryFn: () => sdk.client.fetch<{ pincodes: string[] }>("/admin/cod/blocklist"),
  })
  const [form, setForm] = useState<Record<keyof Settings, string> | null>(null)
  const [enabled, setEnabled] = useState(true)
  const [paste, setPaste] = useState("")
  const [filter, setFilter] = useState("")

  useEffect(() => {
    if (!data) return
    const s = data.settings
    setEnabled(s.cod_enabled)
    setForm({
      cod_enabled: String(s.cod_enabled),
      cod_fee: String(s.cod_fee),
      cod_max_order_value: String(s.cod_max_order_value),
      prepaid_discount_percent: String(s.prepaid_discount_percent),
      cod_confirm_minutes: String(s.cod_confirm_minutes),
    })
  }, [data])

  const onError = (e: Error) => toast.error(e.message)
  const save = useMutation({
    mutationFn: (body: Partial<Settings>) => sdk.client.fetch("/admin/payment-settings", { method: "POST", body }),
    onSuccess: () => {
      toast.success("Settings saved")
      qc.invalidateQueries({ queryKey: ["payment-settings"] })
    },
    onError,
  })
  const add = useMutation({
    mutationFn: (pincodes: string) =>
      sdk.client.fetch<{ added: number; already_listed: number; invalid: string[] }>("/admin/cod/blocklist", { method: "POST", body: { pincodes } }),
    onSuccess: (r) => {
      toast.success(`Added ${r.added} PIN code(s)${r.already_listed ? `, ${r.already_listed} already listed` : ""}`)
      if (r.invalid.length) toast.warning(`Skipped invalid: ${r.invalid.slice(0, 10).join(", ")}${r.invalid.length > 10 ? "…" : ""}`)
      setPaste("")
      qc.invalidateQueries({ queryKey: ["cod-blocklist"] })
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (pincode: string) => sdk.client.fetch(`/admin/cod/blocklist?pincode=${pincode}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cod-blocklist"] }),
    onError,
  })

  const num = (k: keyof Settings) => Number(form?.[k])
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))
  const pins = (block?.pincodes ?? []).filter((p) => p.includes(filter.trim()))
  const minutes = num("cod_confirm_minutes")

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">COD &amp; payment settings</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Applied on the server at checkout. Changes take effect for new checkouts immediately.
          </Text>
        </div>
        {form && (
          <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
            <div className="flex items-center gap-x-3 md:col-span-2">
              <Switch id="cod-enabled" checked={enabled} onCheckedChange={setEnabled} />
              <Label htmlFor="cod-enabled">Offer Cash on Delivery</Label>
              <Badge size="2xsmall" color={enabled ? "green" : "grey"}>{enabled ? "On" : "Off"}</Badge>
            </div>
            {field("COD fee (₹)", "Added to COD orders as a separate line. 0 = no fee.", <Input type="number" min={0} step={1} value={form.cod_fee} onChange={set("cod_fee")} />)}
            {field("Max COD order value (₹)", "COD is hidden above this order value (items, before fees).", <Input type="number" min={1} step={1} value={form.cod_max_order_value} onChange={set("cod_max_order_value")} />)}
            {field("Prepaid discount (%)", "Off for paying online. 0 = no discount. Shown as “Save ₹X with online payment”.", <Input type="number" min={0} max={50} step={0.5} value={form.prepaid_discount_percent} onChange={set("prepaid_discount_percent")} />)}
            {field(
              "Auto-cancel unconfirmed COD orders after (minutes)",
              `${minutes >= 60 ? `${+(minutes / 60).toFixed(1)} hours` : `${minutes} minute(s)`}. Default 1440 = 24 hours.`,
              <Input type="number" min={1} step={1} value={form.cod_confirm_minutes} onChange={set("cod_confirm_minutes")} />
            )}
          </div>
        )}
        <div className="flex justify-end px-6 py-4">
          <Button
            size="small"
            isLoading={save.isPending}
            onClick={() =>
              save.mutate({
                cod_enabled: enabled,
                cod_fee: num("cod_fee"),
                cod_max_order_value: num("cod_max_order_value"),
                prepaid_discount_percent: num("prepaid_discount_percent"),
                cod_confirm_minutes: num("cod_confirm_minutes"),
              })
            }
          >
            Save settings
          </Button>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">COD PIN-code blocklist</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Cash on Delivery is not offered for these delivery PIN codes. {block?.pincodes.length ?? 0} listed.
          </Text>
        </div>
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <Label size="small" htmlFor="cod-paste">Add PIN codes</Label>
          <Textarea id="cod-paste" rows={3} placeholder="One or many: 411001, 560001 or one per line" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div>
            <Button size="small" variant="secondary" disabled={!paste.trim()} isLoading={add.isPending} onClick={() => add.mutate(paste)}>
              Add to blocklist
            </Button>
          </div>
        </div>
        <div className="px-6 py-4">
          <Input size="small" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-3 max-w-xs" />
          {pins.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted">No PIN codes{filter ? " match" : " blocked"}.</Text>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pins.slice(0, 500).map((p) => (
                <span key={p} className="flex items-center gap-x-1 rounded-md border px-2 py-1 font-mono text-sm">
                  {p}
                  <IconButton size="2xsmall" variant="transparent" aria-label={`Remove ${p}`} onClick={() => remove.mutate(p)}>
                    <Trash />
                  </IconButton>
                </span>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "COD & payments", icon: CurrencyDollar })

export default CodSettingsPage
