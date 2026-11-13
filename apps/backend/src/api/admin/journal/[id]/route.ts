import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteJournalArticleWorkflow, updateJournalArticleWorkflow } from "../../../../workflows/journal"
import type { UpdateArticleBody } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<UpdateArticleBody>, res: MedusaResponse) {
  const { result } = await updateJournalArticleWorkflow(req.scope).run({ input: { id: req.params.id, ...req.validatedBody } })
  res.json({ article: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await deleteJournalArticleWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "journal_article", deleted: true })
}
