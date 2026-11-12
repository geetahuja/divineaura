import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { COD_MODULE } from "../modules/cod"
import type CodModuleService from "../modules/cod/service"
import { CONTENT_MODULE } from "../modules/content"
import type ContentModuleService from "../modules/content/service"
import { INVOICE_MODULE } from "../modules/invoice"
import type InvoiceModuleService from "../modules/invoice/service"
import { fillPlaceholders, markdownToHtml } from "./markdown"
import { DEFAULT_REGION_STORE_POLICIES, getRegionPolicies } from "./region-store-policies"

/**
 * Content pages (ARCHITECTURE.md §6, §14): Markdown from Admin → Pages with
 * {{placeholders}} filled from the LIVE settings (COD & payments, region
 * shipping policy, Business details), so fees and days never go stale.
 */
const rupees = (n: number) => {
  const v = Math.round(Number(n) * 100) / 100
  const d = Number.isInteger(v) ? 0 : 2
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`
}
const notSet = (v: string | null | undefined, what: string) => (v && v.trim() ? v.trim() : `[${what} – set in Admin → Business details]`)

export async function pageVariables(c: MedusaContainer): Promise<Record<string, string>> {
  const [cod, biz, regions] = await Promise.all([
    c.resolve<CodModuleService>(COD_MODULE).getSettings(),
    c.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings(),
    c.resolve(Modules.REGION).listRegions({ currency_code: "inr" }, { select: ["metadata"] }),
  ])
  const meta = (regions[0]?.metadata ?? {}) as Record<string, unknown>
  const ship = getRegionPolicies(meta)
  const days = (min: string, max: string) => {
    const lo = Number(meta[min] ?? DEFAULT_REGION_STORE_POLICIES[min as "transit_days_min"])
    const hi = Number(meta[max] ?? DEFAULT_REGION_STORE_POLICIES[max as "transit_days_max"])
    return lo === hi ? `${lo}` : `${lo}–${hi}`
  }
  return {
    brand: biz.brand_name,
    legal_name: biz.legal_name,
    address: notSet(biz.address.split(/\r?\n/).filter(Boolean).join(", "), "address"),
    state: biz.state,
    gstin: notSet(biz.gstin, "GSTIN"),
    support_email: notSet(biz.email, "support email"),
    support_phone: notSet(biz.phone, "support phone"),
    grievance_name: notSet(biz.grievance_name, "Grievance Officer name"),
    grievance_email: notSet(biz.grievance_email ?? biz.email, "grievance email"),
    grievance_phone: notSet(biz.grievance_phone ?? biz.phone, "grievance phone"),
    grievance_ack_hours: String(biz.grievance_ack_hours),
    grievance_resolve_days: String(biz.grievance_resolve_days),
    return_window_days: String(biz.return_window_days),
    free_shipping_threshold: ship.free_shipping_threshold != null ? rupees(ship.free_shipping_threshold) : "[not offered]",
    shipping_fee: rupees(ship.shipping_rate),
    cod_fee: rupees(cod.cod_fee),
    cod_max: rupees(cod.cod_max_order_value),
    prepaid_discount: `${cod.prepaid_discount_percent}%`,
    cod_confirm_hours: String(Math.max(1, Math.round(cod.cod_confirm_minutes / 60))),
    dispatch_days: days("handling_days_min", "handling_days_max"),
    delivery_days: days("transit_days_min", "transit_days_max"),
  }
}

/** A published page with Markdown rendered to safe HTML and live values filled in. */
export async function renderPage(c: MedusaContainer, slug: string, opts: { includeDrafts?: boolean } = {}) {
  const [page] = await c.resolve<ContentModuleService>(CONTENT_MODULE).listPages({ slug })
  if (!page || (!page.published && !opts.includeDrafts)) return null
  const vars = await pageVariables(c)
  const fill = (s: string) => fillPlaceholders(s, vars)
  return {
    slug: page.slug,
    title: fill(page.title),
    html: markdownToHtml(fill(page.body)),
    faq: ((page.faq as unknown as { q: string; a: string }[] | null) ?? []).map((f) => ({ q: fill(f.q), a_html: markdownToHtml(fill(f.a)), a_text: fill(f.a).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*?/g, "") })),
    seo_title: page.seo_title ? fill(page.seo_title) : null,
    seo_description: page.seo_description ? fill(page.seo_description) : null,
    updated_at: page.updated_at,
    draft_note: /DRAFT – owner to review/.test(page.body),
  }
}

/** Public seller block for the footer / Contact (E-Commerce Rules 2020). */
export async function sellerDetails(c: MedusaContainer) {
  const b = await c.resolve<InvoiceModuleService>(INVOICE_MODULE).getSettings()
  return {
    legal_name: b.legal_name,
    brand: b.brand_name,
    address: b.address.split(/\r?\n/).filter(Boolean).join(", ") || null,
    gstin: b.gstin || null,
    email: b.email || null,
    phone: b.phone || null,
    grievance: { name: b.grievance_name || null, email: b.grievance_email || b.email || null, phone: b.grievance_phone || b.phone || null, ack_hours: b.grievance_ack_hours, resolve_days: b.grievance_resolve_days },
  }
}
