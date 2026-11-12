import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { backupMaxAgeHours, backupProblems, readBackupStatus } from "../../../../lib/backups"

// GET /admin/backups/status — last nightly backup, for the admin widget.
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const { configured, status } = await readBackupStatus()
  const problems = configured ? backupProblems(status, new Date(), backupMaxAgeHours()).map((p) => p.problem) : []
  res.json({ configured, status, problems })
}
