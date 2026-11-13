import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { pageVariables } from "../../../../lib/content"
import { fillPlaceholders, markdownToHtml } from "../../../../lib/markdown"
import { JOURNAL_MODULE } from "../../../../modules/journal"
import JournalModuleService from "../../../../modules/journal/service"

// One published article with its Markdown rendered to safe HTML.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [a] = await req.scope.resolve<JournalModuleService>(JOURNAL_MODULE).listArticles({ slug: req.params.slug, published: true, published_at: { $lte: new Date() } })
  if (!a) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Article not found")
  const vars = await pageVariables(req.scope) // {{brand}} etc., like content pages
  res.json({
    article: {
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      html: markdownToHtml(fillPlaceholders(a.body, vars)),
      cover_image_url: a.cover_image_url,
      cover_image_alt: a.cover_image_alt,
      published_at: a.published_at,
      updated_at: a.updated_at,
      seo_title: a.seo_title,
      seo_description: a.seo_description,
    },
  })
}
