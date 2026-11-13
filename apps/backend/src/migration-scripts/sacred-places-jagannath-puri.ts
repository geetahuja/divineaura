import { ExecArgs } from "@medusajs/framework/types"
import { SACRED_PLACES_MODULE } from "../modules/sacred-places"
import type SacredPlacesModuleService from "../modules/sacred-places/service"
import { createSacredPlaceWorkflow } from "../workflows/sacred-places"

// Runs once on `medusa db:migrate`: "Other sacred places" (not on the Nashik skyline)
// are Jagannath Puri, Tirumala and Ayodhya; the first was missing from the seed.
export default async function sacredPlacesJagannathPuri({ container }: ExecArgs) {
  const svc = container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE)
  if ((await svc.listSacredPlaces({ name: "Shri Jagannath Temple" }, { select: ["id"] })).length) return
  const last = (await svc.listSacredPlaces({}, { select: ["rank"], order: { rank: "DESC" }, take: 1 }))[0]?.rank ?? 0
  await createSacredPlaceWorkflow(container).run({
    input: {
      name: "Shri Jagannath Temple",
      location: "Puri, Odisha",
      deity_tag: null,
      strip_label: null,
      description:
        "The temple of Lord Jagannath with Balabhadra and Subhadra in Puri, one of the Char Dham pilgrimages, known for the annual Rath Yatra.",
      rank: last + 1,
      visible: true,
    },
  })
}
