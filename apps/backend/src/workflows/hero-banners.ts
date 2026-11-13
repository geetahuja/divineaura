import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { HERO_BANNERS_MODULE } from "../modules/hero-banners"
import HeroBannersModuleService from "../modules/hero-banners/service"

type Data = Record<string, unknown>
const service = (c: { resolve: <T>(k: string) => T }) => c.resolve<HeroBannersModuleService>(HERO_BANNERS_MODULE)

const createStep_ = createStep(
  "create-hero-banner",
  async (data: Data, { container }) => {
    const banner = await service(container).createHeroBanners(data as never)
    return new StepResponse(banner, banner.id)
  },
  async (id, { container }) => {
    if (id) await service(container).deleteHeroBanners(id)
  }
)

const updateHeroBannerStep = createStep(
  "update-hero-banner",
  async ({ id, ...data }: { id: string } & Data, { container }) => {
    const previous = await service(container).retrieveHeroBanner(id)
    const updated = await service(container).updateHeroBanners({ id, ...data } as never)
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const { created_at, updated_at, deleted_at, ...rest } = previous as Data
    void created_at, void updated_at, void deleted_at
    await service(container).updateHeroBanners(rest as never)
  }
)

const deleteHeroBannerStep = createStep(
  "delete-hero-banner",
  async (id: string, { container }) => {
    await service(container).softDeleteHeroBanners(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) await service(container).restoreHeroBanners(id)
  }
)

export const createHeroBannerWorkflow = createWorkflow(
  "create-hero-banner",
  (input: Data) => new WorkflowResponse(createStep_(input))
)
export const updateHeroBannerWorkflow = createWorkflow(
  "update-hero-banner",
  (input: { id: string } & Data) => new WorkflowResponse(updateHeroBannerStep(input))
)
export const deleteHeroBannerWorkflow = createWorkflow(
  "delete-hero-banner",
  (id: string) => new WorkflowResponse(deleteHeroBannerStep(id))
)
