// Main menu (ARCHITECTURE.md §7). Category, deity, intention and collection
// pages are built in milestones 3–4; until then these links 404.
export type NavLink = { label: string; href: string }
export type NavItem = NavLink & { columns?: { title: string; links: NavLink[] }[] }

const DEITIES = ["Shiva", "Hanuman", "Sai Baba", "Balaji"]
const INTENTIONS = ["Protection", "Prosperity", "Peace", "Focus", "Devotion"]

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-")

export const MAIN_MENU: NavItem[] = [
  {
    label: "Shop by Deity",
    href: "/shop",
    columns: [
      { title: "Deity", links: DEITIES.map((d) => ({ label: d, href: `/deity/${slug(d)}` })) },
      {
        title: "Intention",
        links: INTENTIONS.map((i) => ({ label: i, href: `/intention/${slug(i)}` })),
      },
    ],
  },
  {
    label: "Bracelets",
    href: "/category/bracelets",
    columns: [
      {
        title: "Bracelets",
        links: [
          { label: "Spiritual bracelets", href: "/category/bracelets/spiritual" },
          { label: "Gemstone bracelets", href: "/category/bracelets/gemstone" },
          { label: "All bracelets", href: "/category/bracelets" },
        ],
      },
    ],
  },
  { label: "Lockets", href: "/category/lockets" },
  {
    label: "Malas & Threads",
    href: "/category/malas",
    columns: [
      {
        title: "Malas & Threads",
        links: [
          { label: "Malas", href: "/category/malas" },
          { label: "Hand ties & threads", href: "/category/hand-ties" },
        ],
      },
    ],
  },
  { label: "Gifts", href: "/category/gift-sets" },
  { label: "Offers", href: "/collections/offers" },
]

export const FOOTER_HELP: NavLink[] = [
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Contact us", href: "/contact" },
]

export const FOOTER_POLICIES: NavLink[] = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy policy", href: "/privacy" },
]
