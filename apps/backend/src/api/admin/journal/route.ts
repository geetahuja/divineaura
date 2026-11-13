import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { JOURNAL_MODULE } from "../../../modules/journal"
import JournalModuleService from "../../../modules/journal/service"
import { createJournalArticleWorkflow } from "../../../workflows/journal"
import type { CreateArticleBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const articles = await req.scope.resolve<JournalModuleService>(JOURNAL_MODULE).listArticles({}, { order: { published_at: "DESC", created_at: "DESC" } })
  res.json({ articles })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateArticleBody>, res: MedusaResponse) {
  const { result } = await createJournalArticleWorkflow(req.scope).run({ input: req.validatedBody })
  res.json({ article: result })
}
