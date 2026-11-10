import { model } from "@medusajs/framework/utils"

// Homepage hero, managed in Admin → Hero banners. The storefront shows the
// highest-priority active banner whose schedule includes "now". Images only
// ever come from admin uploads.
const HeroBanner = model.define("hero_banner", {
  id: model.id({ prefix: "hero" }).primaryKey(),
  title: model.text(), // internal name, e.g. "Diwali 2026"
  heading: model.text(),
  subheading: model.text().nullable(),
  button_text: model.text(),
  button_link: model.text(), // site path, e.g. /collections/diwali
  image_desktop_url: model.text().nullable(),
  image_mobile_url: model.text().nullable(),
  image_alt: model.text().nullable(),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  priority: model.number().default(0), // higher wins when schedules overlap
  active: model.boolean().default(true),
})

export default HeroBanner
