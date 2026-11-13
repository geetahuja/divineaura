import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { JOURNAL_MODULE } from "../modules/journal"
import JournalModuleService from "../modules/journal/service"

// Journal article writes (Admin → Journal), with rollback like the other admin settings.
type Data = Record<string, unknown>
const service = (c: { resolve: <T>(k: string) => T }) => c.resolve<JournalModuleService>(JOURNAL_MODULE)

const createJournalArticleStep = createStep(
  "create-journal-article",
  async (data: Data, { container }) => {
    const article = await service(container).createArticles(data as never)
    return new StepResponse(article, article.id)
  },
  async (id, { container }) => {
    if (id) await service(container).deleteArticles(id)
  }
)

const updateJournalArticleStep = createStep(
  "update-journal-article",
  async ({ id, ...data }: { id: string } & Data, { container }) => {
    const previous = await service(container).retrieveArticle(id)
    const updated = await service(container).updateArticles({ id, ...data } as never)
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const { created_at, updated_at, deleted_at, ...rest } = previous as Data
    void created_at, void updated_at, void deleted_at
    await service(container).updateArticles(rest as never)
  }
)

const deleteJournalArticleStep = createStep(
  "delete-journal-article",
  async (id: string, { container }) => {
    await service(container).softDeleteArticles(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) await service(container).restoreArticles(id)
  }
)

export const createJournalArticleWorkflow = createWorkflow("create-journal-article", (input: Data) => new WorkflowResponse(createJournalArticleStep(input)))
export const updateJournalArticleWorkflow = createWorkflow(
  "update-journal-article",
  (input: { id: string } & Data) => new WorkflowResponse(updateJournalArticleStep(input))
)
export const deleteJournalArticleWorkflow = createWorkflow("delete-journal-article", (id: string) => new WorkflowResponse(deleteJournalArticleStep(id)))
