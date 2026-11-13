import fs from "fs"
import path from "path"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { HERO_BANNERS_MODULE } from "../modules/hero-banners"
import type HeroBannersModuleService from "../modules/hero-banners/service"

// Runs once on `medusa db:migrate` (2026-11-13, owner's corrections):
// 1. First slide reads brand name / English tagline / Hindi tagline, all from
//    Business details (placeholders), instead of "Awaken the eternity within…".
// 2. Bracelets slide gets a full-width banner (diya + rudraksha, four bracelets,
//    hazy temples) composed from the built-in artwork.
// Each change only applies while the slide is still exactly as seeded.
// ponytail: AI artwork – GO-LIVE.md asks for real photos before launch.
function heroAssetsDir() {
  for (let dir = __dirname; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    for (const p of [path.join(dir, "assets", "hero"), path.join(dir, "apps", "backend", "assets", "hero")]) {
      if (fs.existsSync(path.join(p, "bracelets-desktop.webp"))) return p
    }
  }
  return null
}

export default async function seedHomepageV2HeroWording({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve<HeroBannersModuleService>(HERO_BANNERS_MODULE)

  const [first] = await service.listHeroBanners({ heading: "Awaken the eternity within," }, { select: ["id"] })
  if (first) {
    await service.updateHeroBanners({
      id: first.id,
      title: "Brand – name and taglines",
      heading: "{{brand}}",
      subheading: "{{tagline_en}}",
      subheading_hi: "{{tagline_hi}}",
    })
    logger.info("Hero: first slide now shows the brand name and taglines.")
  }

  const [bracelets] = await service.listHeroBanners({ button_link: "/category/bracelets", image_desktop_url: null }, { select: ["id"] })
  const dir = heroAssetsDir()
  if (bracelets && dir) {
    const { result } = await uploadFilesWorkflow(container).run({
      input: {
        files: ["bracelets-desktop", "bracelets-mobile"].map((n) => ({
          filename: `${n}.webp`,
          mimeType: "image/webp",
          content: fs.readFileSync(path.join(dir, `${n}.webp`)).toString("base64"),
          access: "public" as const,
        })),
      },
    })
    await service.updateHeroBanners({
      id: bracelets.id,
      image_desktop_url: result[0].url,
      image_mobile_url: result[1].url,
      image_alt: "Illustration: a brass diya with rudraksha beads and gemstone bead bracelets, temples in the haze behind",
    })
    logger.info("Hero: bracelets banner ready.")
  }
}
