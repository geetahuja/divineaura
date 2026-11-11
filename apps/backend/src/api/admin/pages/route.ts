import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../modules/content"
import { PAGE_PATHS } from "../../../modules/content/drafts"
import type ContentModuleService from "../../../modules/content/service"

// Admin → Pages: every content page with its storefront path.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pages = await req.scope.resolve<ContentModuleService>(CONTENT_MODULE).listPages({}, { order: { slug: "ASC" } })
  res.json({
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      path: PAGE_PATHS[p.slug] ?? `/${p.slug}`,
      published: p.published,
      draft: /DRAFT – owner to review/.test(p.body),
      updated_at: p.updated_at,
    })),
  })
}
