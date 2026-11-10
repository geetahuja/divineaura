import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNERS_MODULE } from "../../../modules/hero-banners"
import HeroBannersModuleService from "../../../modules/hero-banners/service"

// The one banner to show now: active, inside its schedule (open ends allowed),
// highest priority first, newest on ties. null = storefront shows its default hero.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: HeroBannersModuleService = req.scope.resolve(HERO_BANNERS_MODULE)
  const banners = await service.listHeroBanners(
    { active: true },
    { order: { priority: "DESC", created_at: "DESC" } }
  )
  const now = Date.now()
  const live = banners.find(
    (b) =>
      (!b.starts_at || new Date(b.starts_at).getTime() <= now) &&
      (!b.ends_at || new Date(b.ends_at).getTime() > now)
  )
  res.json({
    hero_banner: live
      ? {
          heading: live.heading,
          subheading: live.subheading,
          button_text: live.button_text,
          button_link: live.button_link,
          image_desktop_url: live.image_desktop_url,
          image_mobile_url: live.image_mobile_url,
          image_alt: live.image_alt,
        }
      : null,
  })
}
