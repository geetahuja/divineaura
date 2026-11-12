import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** Uptime check for the storefront process (UptimeRobot / deploy.sh). The API has /health. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
