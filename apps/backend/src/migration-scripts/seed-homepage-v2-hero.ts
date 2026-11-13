import fs from "fs"
import path from "path"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { HERO_BANNERS_MODULE } from "../modules/hero-banners"
import type HeroBannersModuleService from "../modules/hero-banners/service"

// Runs once on `medusa db:migrate` (2026-11-13 homepage design v2), after
// seed-homepage-redesign (name order). Replaces the seeded "Carry the Eternal
// Within" slide with the new design's slide — only while it is still exactly as
// seeded, so admin edits are never overwritten. Photos are uploaded like admin uploads.
const OLD_HEADING = "Carry the Eternal Within."

function heroAssetsDir() {
  for (let dir = __dirname; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    for (const p of [path.join(dir, "assets", "hero"), path.join(dir, "apps", "backend", "assets", "hero")]) {
      if (fs.existsSync(path.join(p, "awaken-desktop.webp"))) return p
    }
  }
  return null
}

export default async function seedHomepageV2Hero({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve<HeroBannersModuleService>(HERO_BANNERS_MODULE)
  const [old] = await service.listHeroBanners({ heading: OLD_HEADING, image_desktop_url: null }, { select: ["id"] })
  if (!old) return logger.info("Homepage v2 hero: seeded slide was edited or removed in the admin – left as is.")

  const dir = heroAssetsDir()
  if (!dir) return logger.warn("Homepage v2 hero: assets/hero not found – slide not replaced.")
  const { result } = await uploadFilesWorkflow(container).run({
    input: {
      files: ["awaken-desktop", "awaken-mobile"].map((n) => ({
        filename: `${n}.webp`,
        mimeType: "image/webp",
        content: fs.readFileSync(path.join(dir, `${n}.webp`)).toString("base64"),
        access: "public" as const,
      })),
    },
  })

  await service.updateHeroBanners({
    id: old.id,
    title: "Awaken the eternity within",
    heading: "Awaken the eternity within,",
    subheading: "beyond time, beyond {{brand}}, beyond eternity.", // {{brand}} = name from Business details
    subheading_hi: null,
    button_text: "Discover Our Heritage",
    button_link: "/sacred-nashik",
    image_desktop_url: result[0].url,
    image_mobile_url: result[1].url,
    image_alt: "Shiva in the clouds above statues of Ram, Lakshman and Sita and the temple ghats of the Godavari at sunset",
    caption: "Tapovan, Nashik",
  })
  logger.info("Homepage v2 hero slide ready.")
}
