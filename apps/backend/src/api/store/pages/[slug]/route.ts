import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { renderPage } from "../../../../lib/content"

// Public: a published content page, Markdown rendered to safe HTML with live values filled in.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const page = await renderPage(req.scope, req.params.slug)
  if (!page) return res.status(404).json({ message: "Page not found" })
  res.json({ page })
}
