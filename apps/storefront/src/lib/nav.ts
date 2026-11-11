import "server-only"
import { categoryHref, listCategories, listCollectionsAll, listTags } from "@lib/data/catalogue"

// Menu built from Medusa data (ARCHITECTURE.md §7), so categories, deity /
// intention tags and collections added in the admin appear on their own.
export type NavLink = { label: string; href: string }
export type NavItem = NavLink & { columns?: { title: string; links: NavLink[] }[] }

export async function getMainMenu(): Promise<NavItem[]> {
  const [categories, tags, collections] = await Promise.all([
    listCategories(),
    listTags(),
    listCollectionsAll(),
  ])

  const tagLinks = (kind: "deity" | "intention") =>
    tags.filter((t) => t.kind === kind).map((t) => ({ label: t.label, href: `/${kind}/${t.slug}` }))

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

  for (const c of categories.filter((c) => !c.parent_id)) {
    const href = categoryHref(c, categories)
    const children = categories
      .filter((child) => child.parent_id === c.id)
      .map((child) => ({ label: child.name, href: categoryHref(child, categories) }))
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
  { label: "Track your order", href: "/track-order" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Contact us", href: "/contact" },
]

export const FOOTER_POLICIES: NavLink[] = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
]
