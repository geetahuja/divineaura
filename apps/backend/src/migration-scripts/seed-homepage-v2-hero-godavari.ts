import fs from "fs"
import path from "path"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { HERO_BANNERS_MODULE } from "../modules/hero-banners"
import type HeroBannersModuleService from "../modules/hero-banners/service"

// Runs once on `medusa db:migrate`: gives the seeded Goda Jal slide a full-width
// Godavari banner (pilgrims + ghat temples, composed from the built-in artwork)
// so it fills the v2 hero. Only while the slide still has no photo of its own.
// ponytail: AI artwork – GO-LIVE.md asks for real photos before launch.
function heroAssetsDir() {
  for (let dir = __dirname; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    for (const p of [path.join(dir, "assets", "hero"), path.join(dir, "apps", "backend", "assets", "hero")]) {
      if (fs.existsSync(path.join(p, "godavari-desktop.webp"))) return p
    }
  }
  return null
}

export default async function seedHomepageV2HeroGodavari({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve<HeroBannersModuleService>(HERO_BANNERS_MODULE)
  const [slide] = await service.listHeroBanners({ button_link: "/kumbh-special", image_desktop_url: null }, { select: ["id"] })
  if (!slide) return logger.info("Godavari hero: Goda Jal slide already has a photo or was removed – left as is.")
  const dir = heroAssetsDir()
  if (!dir) return logger.warn("Godavari hero: assets/hero not found – slide not changed.")
  const { result } = await uploadFilesWorkflow(container).run({
    input: {
      files: ["godavari-desktop", "godavari-mobile"].map((n) => ({
        filename: `${n}.webp`,
        mimeType: "image/webp",
        content: fs.readFileSync(path.join(dir, `${n}.webp`)).toString("base64"),
        access: "public" as const,
      })),
    },
  })
  await service.updateHeroBanners({
    id: slide.id,
    image_desktop_url: result[0].url,
    image_mobile_url: result[1].url,
    image_alt: "Illustration: pilgrims bathing in the Godavari below temples on the ghats at sunrise",
  })
  logger.info("Godavari hero banner ready.")
}
