import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SACRED_PLACES_MODULE } from "../../../modules/sacred-places"
import SacredPlacesModuleService from "../../../modules/sacred-places/service"

// Visible entries in admin order, with the linked collection's handle so the
// storefront can link each card.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: SacredPlacesModuleService = req.scope.resolve(SACRED_PLACES_MODULE)
  const places = await service.listSacredPlaces(
    { visible: true },
    {
      select: [
        "id",
        "name",
        "location",
        "description",
        "image_url",
        "image_credit",
        "deity_tag",
        "collection_id",
        "strip_label",
      ],
      order: { rank: "ASC", created_at: "ASC" },
    }
  )

  const collectionIds = places.map((p) => p.collection_id).filter((id): id is string => !!id)
  const collections = collectionIds.length
    ? (
        await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "product_collection",
          fields: ["id", "handle"],
          filters: { id: collectionIds },
        })
      ).data
    : []
  const handles = new Map(collections.map((c) => [c.id, c.handle]))

  res.json({
    sacred_places: places.map(({ collection_id, ...p }) => ({
      ...p,
      collection_handle: collection_id ? handles.get(collection_id) ?? null : null,
    })),
  })
}
