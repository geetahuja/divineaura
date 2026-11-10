import "server-only"
import { sdk } from "@lib/config"

export type SacredPlace = {
  id: string
  name: string
  location: string
  description: string
  image_url: string | null
  image_credit: string | null
  deity_tag: string | null
  collection_handle: string | null
}

// Visible entries in admin order; admin changes show up within 5 minutes.
export const listSacredPlaces = () =>
  sdk.client
    .fetch<{ sacred_places: SacredPlace[] }>("/store/sacred-places", {
      next: { revalidate: 300 },
      cache: "force-cache",
    })
    .then((r) => r.sacred_places)
    .catch(() => [] as SacredPlace[])
