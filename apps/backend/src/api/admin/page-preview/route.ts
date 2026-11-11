import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { pageVariables } from "../../../lib/content"
import { fillPlaceholders, markdownToHtml } from "../../../lib/markdown"

// Live preview in the page editor: the same rendering the storefront gets.
export async function POST(req: MedusaRequest<{ body: string }>, res: MedusaResponse) {
  res.json({ html: markdownToHtml(fillPlaceholders(req.validatedBody.body, await pageVariables(req.scope))) })
}
