import { ExecArgs } from "@medusajs/framework/types"
import { CONTENT_MODULE } from "../modules/content"
import { DRAFTS } from "../modules/content/drafts"
import type ContentModuleService from "../modules/content/service"

// Milestone 12 (runs once on `medusa db:migrate`): first drafts of the content
// pages. Only creates pages that don't exist — never overwrites admin edits.
export default async function contentPages({ container }: ExecArgs) {
  const svc = container.resolve<ContentModuleService>(CONTENT_MODULE)
  const existing = new Set((await svc.listPages({}, { select: ["slug"] })).map((p) => p.slug))
  const missing = DRAFTS.filter((d) => !existing.has(d.slug))
  if (missing.length) await svc.createPages(missing.map((d) => ({ ...d, faq: (d.faq ?? null) as unknown as Record<string, unknown> | null, published: true })))
}
