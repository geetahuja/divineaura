import { readFile } from "fs/promises"

/**
 * Nightly backups (ARCHITECTURE.md §18) run on the VPS outside Node
 * (deploy/backup/backup.sh). It writes a small status file; the backend reads it
 * for the admin widget and the backup-alerts job. BACKUP_STATUS_FILE unset = dev.
 */
export type BackupStatus = {
  status: "ok" | "failed"
  finished_at: string
  last_success_at: string | null
  backup: string
  db_bytes: number
  uploads_bytes: number
  error: string | null
}

export const backupMaxAgeHours = () => Number(process.env.BACKUP_MAX_AGE_HOURS) || 48

export async function readBackupStatus(path = process.env.BACKUP_STATUS_FILE) {
  if (!path) return { configured: false, status: null as BackupStatus | null }
  try {
    return { configured: true, status: JSON.parse(await readFile(path, "utf8")) as BackupStatus }
  } catch {
    return { configured: true, status: null as BackupStatus | null } // never ran, or unreadable
  }
}

const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })

/**
 * What to warn the owner about. `key` dedupes the email in message_log:
 * one email per failed run, and at most one per day while backups are stale.
 */
export function backupProblems(s: BackupStatus | null, now: Date, maxAgeHours = 48) {
  const out: { key: string; problem: string; details: string }[] = []
  if (s?.status === "failed") {
    out.push({ key: `backup_alert:failed:${s.finished_at}`, problem: "the last backup failed", details: `Backup ${s.backup} failed at ${ist(s.finished_at)}: ${s.error ?? "unknown error"}.` })
  }
  const last = s?.last_success_at ? new Date(s.last_success_at) : null
  if (!last || now.getTime() - last.getTime() > maxAgeHours * 3_600_000) {
    out.push({
      key: `backup_alert:stale:${now.toISOString().slice(0, 10)}`,
      problem: `no successful backup in the last ${maxAgeHours} hours`,
      details: last ? `Last successful backup: ${ist(last.toISOString())}.` : "No successful backup has been recorded on this server yet.",
    })
  }
  return out
}
