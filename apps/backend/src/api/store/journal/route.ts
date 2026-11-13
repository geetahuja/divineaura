import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"
import JournalModuleService from "../../../modules/journal/service"

// Published articles whose publish date has arrived, newest first (no body).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rows = await req.scope.resolve<JournalModuleService>(JOURNAL_MODULE).listArticles(
    { published: true, published_at: { $lte: new Date() } },
    { select: ["title", "slug", "excerpt", "cover_image_url", "cover_image_alt", "published_at"], order: { published_at: "DESC" }, take: 100 }
  )
  res.json({ articles: rows })
}
