import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { SACRED_PLACES_MODULE } from "../modules/sacred-places"
import SacredPlacesModuleService from "../modules/sacred-places/service"

type SacredPlaceData = Record<string, unknown>

const strip = ({ created_at, updated_at, deleted_at, ...rest }: Record<string, unknown>) => {
  void created_at, void updated_at, void deleted_at
  return rest
}

const createSacredPlaceStep = createStep(
  "create-sacred-place",
  async (data: SacredPlaceData, { container }) => {
    const service: SacredPlacesModuleService = container.resolve(SACRED_PLACES_MODULE)
    const place = await service.createSacredPlaces(data as never)
    return new StepResponse(place, place.id)
  },
  async (id, { container }) => {
    if (id) {
      await container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE).deleteSacredPlaces(id)
    }
  }
)

const updateSacredPlacesStep = createStep(
  "update-sacred-places",
  async (updates: ({ id: string } & SacredPlaceData)[], { container }) => {
    const service: SacredPlacesModuleService = container.resolve(SACRED_PLACES_MODULE)
    const previous = await service.listSacredPlaces({ id: updates.map((u) => u.id) })
    const updated = await service.updateSacredPlaces(updates as never)
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (previous?.length) {
      await container
        .resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE)
        .updateSacredPlaces(previous.map((p) => strip(p as never)) as never)
    }
  }
)

const deleteSacredPlaceStep = createStep(
  "delete-sacred-place",
  async (id: string, { container }) => {
    const service: SacredPlacesModuleService = container.resolve(SACRED_PLACES_MODULE)
    await service.softDeleteSacredPlaces(id)
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (id) {
      await container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE).restoreSacredPlaces(id)
    }
  }
)

export const createSacredPlaceWorkflow = createWorkflow(
  "create-sacred-place",
  (input: SacredPlaceData) => new WorkflowResponse(createSacredPlaceStep(input))
)

// Takes several updates so a reorder (swapping two ranks) is one transaction.
export const updateSacredPlacesWorkflow = createWorkflow(
  "update-sacred-places",
  (input: ({ id: string } & SacredPlaceData)[]) => new WorkflowResponse(updateSacredPlacesStep(input))
)

export const deleteSacredPlaceWorkflow = createWorkflow(
  "delete-sacred-place",
  (id: string) => new WorkflowResponse(deleteSacredPlaceStep(id))
)
