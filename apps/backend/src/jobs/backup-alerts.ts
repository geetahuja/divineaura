import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { backupMaxAgeHours, backupProblems, readBackupStatus } from "../lib/backups"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"

// Emails BACKUP_ALERT_EMAIL (via the messaging layer) when the nightly backup failed
// or none succeeded within BACKUP_MAX_AGE_HOURS (default 48). Off when BACKUP_STATUS_FILE is unset.
export default async function backupAlerts(container: MedusaContainer) {
  const { configured, status } = await readBackupStatus()
  if (!configured) return
  const problems = backupProblems(status, new Date(), backupMaxAgeHours())
  if (!problems.length) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const to = process.env.BACKUP_ALERT_EMAIL
  if (!to) return logger.warn(`backup-alerts: ${problems.map((p) => p.problem).join("; ")} — set BACKUP_ALERT_EMAIL to get an email`)
  const link = `${(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")}/app/orders`
  const messaging = container.resolve<MessagingModuleService>(MESSAGING_MODULE)
  for (const p of problems) {
    await messaging.sendMessage("backup_alert", { email: to }, { problem: p.problem, details: p.details, link }, { dedupeKey: p.key })
  }
}

export const config = { name: "backup-alerts", schedule: "10 * * * *" } // hourly
