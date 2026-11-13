import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNERS_MODULE } from "../../../modules/hero-banners"
import HeroBannersModuleService from "../../../modules/hero-banners/service"

// Slides to show now (max 5): active, inside their schedule (open ends allowed),
// highest priority first, newest on ties. Empty = storefront shows its default hero.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: HeroBannersModuleService = req.scope.resolve(HERO_BANNERS_MODULE)
  const banners = await service.listHeroBanners(
    { active: true },
    { order: { priority: "DESC", created_at: "DESC" } }
  )
  const now = Date.now()
  const live = banners
    .filter((b) => (!b.starts_at || new Date(b.starts_at).getTime() <= now) && (!b.ends_at || new Date(b.ends_at).getTime() > now))
    .slice(0, 5)
    .map((b) => ({
      heading: b.heading,
      subheading: b.subheading,
      subheading_hi: b.subheading_hi,
      button_text: b.button_text,
      button_link: b.button_link,
      image_desktop_url: b.image_desktop_url,
      image_mobile_url: b.image_mobile_url,
      image_alt: b.image_alt,
      caption: b.caption,
    }))
  // hero_banner kept for older storefront builds during a deploy.
  res.json({ hero_banners: live, hero_banner: live[0] ?? null })
}
