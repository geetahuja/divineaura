import { backupProblems, BackupStatus } from "../backups"

const now = new Date("2026-11-12T10:00:00Z")
const st = (o: Partial<BackupStatus> = {}): BackupStatus => ({
  status: "ok",
  finished_at: "2026-11-11T21:00:05Z",
  last_success_at: "2026-11-11T21:00:05Z",
  backup: "2026-11-12_0230",
  db_bytes: 1,
  uploads_bytes: 1,
  error: null,
  ...o,
})

describe("backup alerts", () => {
  it("is quiet after a recent good backup", () => {
    expect(backupProblems(st(), now)).toEqual([])
  })
  it("alerts once per failed run", () => {
    const p = backupProblems(st({ status: "failed", finished_at: "2026-11-12T09:00:00Z", error: "step database dump failed" }), now)
    expect(p).toHaveLength(1)
    expect(p[0].key).toBe("backup_alert:failed:2026-11-12T09:00:00Z")
    expect(p[0].details).toMatch(/database dump/)
  })
  it("alerts (once a day) when the last success is older than 48 h, or there is none", () => {
    const old = backupProblems(st({ last_success_at: "2026-11-10T09:59:00Z" }), now)
    expect(old.map((p) => p.key)).toEqual(["backup_alert:stale:2026-11-12"])
    expect(backupProblems(null, now)[0].details).toMatch(/No successful backup/)
    expect(backupProblems(st({ last_success_at: "2026-11-10T10:01:00Z" }), now)).toEqual([]) // 47h59m
  })
})
