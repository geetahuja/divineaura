import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type Res = {
  configured: boolean
  status: { status: "ok" | "failed"; finished_at: string; last_success_at: string | null; db_bytes: number; uploads_bytes: number; error: string | null } | null
  problems: string[]
}
const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })

// One line above the orders list (the admin's landing page): last nightly backup.
const BackupStatusWidget = () => {
  const { data } = useQuery({ queryKey: ["backup-status"], queryFn: () => sdk.client.fetch<Res>("/admin/backups/status") })
  if (!data) return null
  const s = data.status
  const ok = data.configured && data.problems.length === 0
  return (
    <Container className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3">
      <Text size="small" weight="plus">Last backup</Text>
      {!data.configured ? (
        <Text size="small" className="text-ui-fg-subtle">Not set up on this server (BACKUP_STATUS_FILE)</Text>
      ) : (
        <>
          <Badge size="2xsmall" color={ok ? "green" : "red"}>{ok ? "OK" : "Needs attention"}</Badge>
          <Text size="small" className="text-ui-fg-subtle">
            {s ? `${when(s.finished_at)} · ${s.status === "ok" ? `database ${mb(s.db_bytes)}, uploads ${mb(s.uploads_bytes)}` : `failed: ${s.error ?? "unknown"}`}` : "none yet"}
            {data.problems.length > 0 && ` — ${data.problems.join("; ")}`}
          </Text>
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.list.before" })
export default BackupStatusWidget
