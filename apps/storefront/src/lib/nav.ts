import "server-only"
import { categoryHref, listCategories, listCollectionsAll, listTags } from "@lib/data/catalogue"
import { listSacredPlaces, placeAnchor } from "@lib/data/sacred-places"

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

/**
 * Header menu (Option A design): Home | Shop ▾ | Goda Jal | Kumbh Special |
 * Sacred Nashik ▾ | Our Story | Journal | Contact. "Shop" holds the catalogue
 * menu above as columns; "Sacred Nashik" lists the places on the skyline strip.
 */
export async function getHeaderMenu(): Promise<NavItem[]> {
  const [catalogue, places] = await Promise.all([getMainMenu(), listSacredPlaces()])
  const loose = catalogue.filter((i) => !i.columns).map(({ label, href }) => ({ label, href }))
  const shopColumns = [
    ...catalogue.flatMap((i) => i.columns ?? []),
    ...(loose.length ? [{ title: "More", links: loose }] : []),
  ]
  const nashik = places.filter((p) => p.strip_label)
  return [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop", columns: shopColumns.length ? [{ title: "All products", links: [{ label: "Shop all", href: "/shop" }] }, ...shopColumns] : undefined },
    { label: "Goda Jal", href: "/category/goda-jal" },
    { label: "Kumbh Special", href: "/kumbh-special" },
    {
      label: "Sacred Nashik",
      href: "/sacred-nashik",
      columns: nashik.length
        ? [{ title: "Sacred Nashik", links: [...nashik.map((p) => ({ label: p.strip_label!, href: `/sacred-nashik#${placeAnchor(p.name)}` })), { label: "All sacred places", href: "/sacred-nashik" }] }]
        : undefined,
    },
    { label: "Our Story", href: "/about" },
    { label: "Journal", href: "/journal" },
    { label: "Contact", href: "/contact" },
  ]
}

export const FOOTER_HELP: NavLink[] = [
  { label: "Track your order", href: "/track-order" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact us", href: "/contact" },
  { label: "About us", href: "/about" },
]

export const FOOTER_POLICIES: NavLink[] = [
  { label: "Shipping", href: "/policies/shipping" },
  { label: "Returns & refunds", href: "/policies/returns-refunds" },
  { label: "Cancellation", href: "/policies/cancellation" },
  { label: "Privacy policy", href: "/policies/privacy" },
  { label: "Terms of use", href: "/policies/terms" },
  { label: "Grievance redressal", href: "/policies/grievance" },
]
