import "server-only"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

// Menu built from Medusa data (ARCHITECTURE.md §7), so categories, deity /
// intention tags and collections added in the admin appear on their own.
// Their listing pages arrive in milestone 4; until then those links 404.
export type NavLink = { label: string; href: string }
export type NavItem = NavLink & { columns?: { title: string; links: NavLink[] }[] }

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

// "deity:Sai Baba" → { label: "Sai Baba", href: "/deity/sai-baba" }
export const tagLink = (value: string): NavLink | null => {
  const [prefix, ...rest] = value.split(":")
  const label = rest.join(":").trim()
  if (!label || (prefix !== "deity" && prefix !== "intention")) {
    return null
  }
  return { label, href: `/${prefix}/${slugify(label)}` }
}

// Admin changes show up within 5 minutes.
const fetchOpts = { next: { revalidate: 300 }, cache: "force-cache" as const }

export async function getMainMenu(): Promise<NavItem[]> {
  const [categories, tags, collections] = await Promise.all([
    sdk.client
      .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>("/store/product-categories", {
        query: {
          fields: "id,name,handle,rank,parent_category_id,*category_children",
          parent_category_id: "null",
          limit: 100,
        },
        ...fetchOpts,
      })
      .then((r) => r.product_categories)
      .catch(() => []),
    sdk.client
      .fetch<{ product_tags: HttpTypes.StoreProductTag[] }>("/store/product-tags", {
        query: { fields: "id,value", limit: 200 },
        ...fetchOpts,
      })
      .then((r) => r.product_tags)
      .catch(() => []),
    sdk.client
      .fetch<{ collections: HttpTypes.StoreCollection[] }>("/store/collections", {
        query: { fields: "id,title,handle", limit: 100 },
        ...fetchOpts,
      })
      .then((r) => r.collections)
      .catch(() => []),
  ])

  const tagLinks = (prefix: string) =>
    tags
      .filter((t) => t.value.startsWith(`${prefix}:`))
      .map((t) => tagLink(t.value))
      .filter((l): l is NavLink => !!l)
      .sort((a, b) => a.label.localeCompare(b.label))

  const menu: NavItem[] = []

  const deities = tagLinks("deity")
  const intentions = tagLinks("intention")
  if (deities.length || intentions.length) {
    menu.push({
      label: "Shop by Deity",
      href: "/shop",
      columns: [
        ...(deities.length ? [{ title: "Deity", links: deities }] : []),
        ...(intentions.length ? [{ title: "Intention", links: intentions }] : []),
      ],
    })
  }

  for (const c of [...categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
    const href = `/category/${c.handle}`
    const children = (c.category_children ?? [])
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((child) => ({ label: child.name, href: `/category/${child.handle}` }))
    menu.push({
      label: c.name,
      href,
      columns: children.length
        ? [{ title: c.name, links: [...children, { label: `All ${c.name.toLowerCase()}`, href }] }]
        : undefined,
    })
  }

  const festivals = collections
    .filter((c) => c.handle !== "offers")
    .map((c) => ({ label: c.title, href: `/collections/${c.handle}` }))
  if (festivals.length) {
    menu.push({ label: "Festivals", href: "/shop", columns: [{ title: "Festivals", links: festivals }] })
  }
  if (collections.some((c) => c.handle === "offers")) {
    menu.push({ label: "Offers", href: "/collections/offers" })
  }

  return menu
}

export const FOOTER_HELP: NavLink[] = [
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Contact us", href: "/contact" },
]

export const FOOTER_POLICIES: NavLink[] = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
]
