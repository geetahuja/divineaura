import { siteMode } from "@lib/util/site-mode"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const safeId = (id?: string) => (id && /^[A-Za-z0-9-]+$/.test(id) ? id : null)

/**
 * Runtime settings for the browser, so adding the GA4 / Meta Pixel IDs (or going
 * live) is an .env change + restart, not a rebuild. Analytics stay off on staging.
 */
export function GET() {
  const live = siteMode() === "live"
  return NextResponse.json(
    {
      mode: siteMode(),
      ga4: live ? safeId(process.env.GA4_ID || process.env.NEXT_PUBLIC_GA4_ID) : null,
      pixel: live ? safeId(process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID) : null,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  )
}
