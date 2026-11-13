import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CONTENT_MODULE } from "../modules/content"
import { DRAFTS } from "../modules/content/drafts"
import type ContentModuleService from "../modules/content/service"

// Runs once on `medusa db:migrate`: DivineAura → Anant Sanatan in data created
// before the rebrand (2026-11-13). Business details are updated by the invoice
// module migration. Content pages get the {{brand}} placeholder so a future
// rename is a Business details edit only.
const OLD = /DivineAura|Divine Aura/g
const HAS_OLD = /DivineAura|Divine Aura/ // no g flag: .test() must not keep lastIndex
const rename = (s: string | null | undefined) => (s ? s.replace(OLD, "Anant Sanatan") : s)

export default async function rebrandAnantSanatan({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const storeSvc = container.resolve(Modules.STORE)
  for (const s of await storeSvc.listStores({}, { select: ["id", "name"] })) {
    if (HAS_OLD.test(s.name)) await storeSvc.updateStores(s.id, { name: rename(s.name)! })
  }
  const channels = container.resolve(Modules.SALES_CHANNEL)
  for (const c of await channels.listSalesChannels({}, { select: ["id", "name"] })) {
    if (HAS_OLD.test(c.name)) await channels.updateSalesChannels(c.id, { name: rename(c.name)! })
  }
  const locations = container.resolve(Modules.STOCK_LOCATION)
  for (const l of await locations.listStockLocations({}, { select: ["id", "name"] })) {
    if (HAS_OLD.test(l.name)) await locations.updateStockLocations({ id: l.id }, { name: rename(l.name)! })
  }

  // Pages: placeholder everywhere; the untouched old About draft becomes the new "Our story".
  const content = container.resolve<ContentModuleService>(CONTENT_MODULE)
  const about = DRAFTS.find((d) => d.slug === "about")!
  const toPlaceholder = (s: string | null) => (s ? s.replace(/DivineAura's|Divine Aura's/g, "{{brand}}'s").replace(OLD, "{{brand}}") : s)
  for (const p of await content.listPages({})) {
    const untouchedAbout = p.slug === "about" && p.body.includes("began with a simple wish")
    const next = untouchedAbout
      ? { title: about.title, seo_title: about.seo_title, seo_description: about.seo_description, body: about.body }
      : { title: toPlaceholder(p.title)!, seo_title: toPlaceholder(p.seo_title), seo_description: toPlaceholder(p.seo_description), body: toPlaceholder(p.body)! }
    if (untouchedAbout || next.title !== p.title || next.seo_title !== p.seo_title || next.seo_description !== p.seo_description || next.body !== p.body) {
      await content.updatePages({ id: p.id, ...next })
    }
  }
  logger.info("Rebranded stored data to Anant Sanatan.")
}
