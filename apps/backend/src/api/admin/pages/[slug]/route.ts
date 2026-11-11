import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { pageVariables } from "../../../../lib/content"
import { CONTENT_MODULE } from "../../../../modules/content"
import { PAGE_PATHS } from "../../../../modules/content/drafts"
import type ContentModuleService from "../../../../modules/content/service"
import type { UpdatePageBody } from "../../../validators"

async function load(req: MedusaRequest) {
  const [p] = await req.scope.resolve<ContentModuleService>(CONTENT_MODULE).listPages({ slug: req.params.slug })
  if (!p) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
  return p
}

// The raw page for editing, plus the placeholders available with their current values.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const p = await load(req)
  res.json({ page: { ...p, path: PAGE_PATHS[p.slug] ?? `/${p.slug}` }, placeholders: await pageVariables(req.scope) })
}

export async function POST(req: MedusaRequest<UpdatePageBody>, res: MedusaResponse) {
  const p = await load(req)
  const b = req.validatedBody
  const updated = await req.scope
    .resolve<ContentModuleService>(CONTENT_MODULE)
    .updatePages({ id: p.id, ...b, faq: (b.faq ?? null) as unknown as Record<string, unknown> | null })
  res.json({ page: updated })
}
