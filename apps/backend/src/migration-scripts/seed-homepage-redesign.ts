import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createCollectionsWorkflow, createProductCategoriesWorkflow, createProductTagsWorkflow, createProductTypesWorkflow } from "@medusajs/medusa/core-flows"
import { HERO_BANNERS_MODULE } from "../modules/hero-banners"
import type HeroBannersModuleService from "../modules/hero-banners/service"
import { JOURNAL_MODULE } from "../modules/journal"
import type JournalModuleService from "../modules/journal/service"
import { SACRED_PLACES_MODULE } from "../modules/sacred-places"
import type SacredPlacesModuleService from "../modules/sacred-places/service"
import { createHeroBannerWorkflow } from "../workflows/hero-banners"
import { createJournalArticleWorkflow } from "../workflows/journal"
import { createSacredPlaceWorkflow, updateSacredPlacesWorkflow } from "../workflows/sacred-places"

// Runs once on `medusa db:migrate` (2026-11-13 redesign), after seed-catalogue-defaults
// (scripts run in name order). Real site structure, not
// demo data: everything is editable in the admin. Never overwrites admin edits —
// only creates what's missing and fills empty strip labels.

const DRAFT = "> DRAFT – owner to review. Please check every statement before publishing, then delete this line."

/** The "Sacred Nashik" skyline, left → right. `match` finds an existing entry by name. */
const STRIP: { label: string; match?: string; create?: { name: string; location: string; deity_tag: string | null; description: string } }[] = [
  { label: "Kalaram Mandir", match: "Kalaram Mandir" },
  {
    label: "Ram Ghat (Ramkund)",
    create: {
      name: "Ram Ghat (Ramkund)",
      location: "Panchavati, Nashik",
      deity_tag: "deity:Ram",
      description:
        "The main bathing ghat on the Godavari at Panchavati. Pilgrims take a holy dip here, and during the Simhastha Kumbh Mela it is one of the central sites of the Amrut Snan.",
    },
  },
  {
    label: "Dutondya Maruti Mandir",
    create: {
      name: "Dutondya Maruti Mandir",
      location: "Godavari bank near Ramkund, Panchavati",
      deity_tag: "deity:Hanuman",
      description:
        "A stone image of Hanuman on the bank of the Godavari near Ramkund. Its name means “two-faced Maruti”, and Nashik residents traditionally judge the river's flood level by how high the water rises on the idol.",
    },
  },
  { label: "Trimbakeshwar", match: "Trimbakeshwar Jyotirlinga" },
  {
    label: "Brahmagiri",
    create: {
      name: "Brahmagiri",
      location: "Trimbak, Nashik",
      deity_tag: "deity:Shiva",
      description:
        "The hill above Trimbakeshwar where the Godavari is traditionally said to rise. Pilgrims climb its stone steps to the shrines near the river's source.",
    },
  },
  { label: "Tapovan", match: "Tapovan" },
  { label: "Shirdi Sai Baba", match: "Shri Saibaba Samadhi Mandir" },
  {
    label: "Balaji",
    create: {
      name: "Shri Balaji Mandir, Nashik",
      location: "Nashik",
      deity_tag: "deity:Balaji",
      description: "A temple of Lord Venkateswara, worshipped as Balaji, visited by devotees in Nashik.",
    },
  },
]

const HERO = [
  {
    title: "Carry the Eternal Within",
    heading: "Carry the Eternal Within.",
    subheading: "Beyond Eternity, Beyond Time.",
    subheading_hi: "समय से पहले, समय के बाद भी।",
    button_text: "Explore the Collection",
    button_link: "/shop",
    image_alt: "Sunrise over the Godavari with temples on the ghats",
    priority: 30,
  },
  {
    title: "Kumbh Special – Goda Jal",
    heading: "Bring the sacred Godavari home",
    subheading: "Goda Jal (Godavari Water) · Kumbh Special",
    subheading_hi: "गोदा जल – गोदावरी का जल",
    button_text: "Know More",
    button_link: "/kumbh-special",
    image_alt: "Pilgrims at the ghats of the Godavari in Nashik",
    priority: 20,
  },
  {
    title: "Gemstone & spiritual bracelets",
    heading: "Gemstone & Spiritual Bracelets",
    subheading: "Seven Chakra, Tiger Eye, Pyrite and more – every stone described truthfully.",
    subheading_hi: null,
    button_text: "Shop Bracelets",
    button_link: "/category/bracelets",
    image_alt: "Gemstone bead bracelets on an ivory cloth",
    priority: 10,
  },
]

const ARTICLES = [
  {
    title: "The Amrut Snan dates of Nashik–Trimbakeshwar Simhastha 2027",
    slug: "amrut-snan-dates-nashik-trimbakeshwar-simhastha-2027",
    excerpt: "When and where the Amrut Snan of the Nashik–Trimbakeshwar Simhastha Kumbh Mela takes place, and how to plan your visit.",
    seo_title: "Amrut Snan dates – Nashik–Trimbakeshwar Simhastha 2027",
    seo_description: "The Amrut Snan dates of the Nashik–Trimbakeshwar Simhastha Kumbh Mela 2027, the two bathing places and tips for pilgrims.",
    body: `${DRAFT}

The Simhastha Kumbh Mela is held at Nashik and Trimbakeshwar about once every twelve years, when Jupiter (Guru) is in the sign of Leo (Simha). Over the months of the Mela, a few days are set aside as **Amrut Snan** (also called Shahi Snan) — the main bathing days, when the akharas go in procession to the river.

## Two bathing places
- **Ram Ghat (Ramkund), Nashik** — on the Godavari at Panchavati.
- **Kushavarta, Trimbakeshwar** — the sacred tank near the Trimbakeshwar Jyotirlinga, close to the source of the Godavari.

## The Amrut Snan dates
- **First Amrut Snan:** [date and tithi – owner to confirm from the official schedule]
- **Second Amrut Snan:** [date and tithi – owner to confirm]
- **Third Amrut Snan:** [date and tithi – owner to confirm]

Dates are announced by the Mela authorities and can change. Always check the official Simhastha announcements before you travel.

## Planning your visit
- Expect very large crowds on Amrut Snan days; arrive early and follow the police and volunteer instructions.
- Keep a small bag, a water bottle and a copy of your ID.
- If you cannot travel, many families keep Godavari water at home for puja — see our [Goda Jal](/category/goda-jal).

*{{brand}} is not affiliated with the Nashik–Trimbakeshwar Kumbh Mela Authority or any government body.*`,
  },
  {
    title: "Sacred places of Panchavati",
    slug: "sacred-places-of-panchavati",
    excerpt: "Kalaram Mandir, Ram Ghat, Dutondya Maruti and more — a short walk through Panchavati on the banks of the Godavari.",
    seo_title: "Sacred places of Panchavati, Nashik",
    seo_description: "A short guide to the temples and ghats of Panchavati in Nashik: Kalaram Mandir, Ramkund, Dutondya Maruti, Sita Gufa and Tapovan.",
    body: `${DRAFT}

Panchavati, on the left bank of the Godavari in Nashik, takes its name from *panch* (five) and *vat* (banyan trees). In the Ramayana tradition it is where Lord Ram, Sita and Lakshman lived for part of their exile.

## Kalaram Mandir
A stone temple to Lord Ram, Sita and Lakshman, named after its black-stone idol of Ram. It is the best-known temple of Panchavati.

## Ram Ghat (Ramkund)
The main ghat on the Godavari, where pilgrims bathe and perform rituals for their ancestors. During the Simhastha Kumbh Mela it is one of the two Amrut Snan sites.

## Dutondya Maruti
A stone image of Hanuman on the river bank near Ramkund. Residents traditionally judge how high the Godavari is flooding by how far the water rises on the idol.

## Sita Gufa
A small cave temple associated in local tradition with Sita during the exile.

## Tapovan
A quieter stretch of the Godavari near Panchavati, linked in tradition to the stay of Ram, Sita and Lakshman in the forest.

See all the places on our [Sacred Nashik](/sacred-nashik) page.`,
  },
]

export default async function seedHomepageRedesign({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const products = container.resolve(Modules.PRODUCT)

  // 1. Categories + Kumbh Special collection + bestseller tag.
  const existingCats = await products.listProductCategories({ handle: ["goda-jal", "puja-essentials"] }, { select: ["handle"] })
  const has = new Set(existingCats.map((c) => c.handle))
  const newCats = [
    { name: "Goda Jal (Godavari Water)", handle: "goda-jal", description: "Water of the Godavari from Nashik, for puja and snan at home. For religious/puja use only. Not for drinking or internal consumption.", rank: 10 },
    { name: "Puja Essentials", handle: "puja-essentials", description: "Thalis, diyas and other essentials for puja at home.", rank: 11 },
  ].filter((c) => !has.has(c.handle))
  if (newCats.length) await createProductCategoriesWorkflow(container).run({ input: { product_categories: newCats.map((c) => ({ ...c, is_active: true })) } })
  if (!(await products.listProductCollections({ handle: "kumbh-special" }, { select: ["id"] })).length) {
    await createCollectionsWorkflow(container).run({ input: { collections: [{ title: "Kumbh Special", handle: "kumbh-special" }] } })
  }
  // Product types for SKUs (AS-GDJ-…) and per-type GST. Goda Jal GST rate: confirm with the CA, then set it in Settings → Tax Regions.
  const types = new Set((await products.listProductTypes({}, { select: ["value"] })).map((t) => t.value))
  const newTypes = [
    { value: "Goda Jal", metadata: { sku_code: "GDJ" } },
    { value: "Puja Essential", metadata: { sku_code: "PUJ" } },
  ].filter((t) => !types.has(t.value))
  if (newTypes.length) await createProductTypesWorkflow(container).run({ input: { product_types: newTypes } })
  if (!(await products.listProductTags({ value: "bestseller" }, { select: ["id"] })).length) {
    await createProductTagsWorkflow(container).run({ input: { product_tags: [{ value: "bestseller" }] } })
  }

  // 2. Sacred Nashik strip: labels + missing places, in skyline order; the rest follow.
  const places = await container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE).listSacredPlaces({}, { order: { rank: "ASC" } })
  const updates: { id: string; strip_label?: string; rank: number }[] = []
  for (const [rank, s] of STRIP.entries()) {
    const found = places.find((p) => p.name === (s.match ?? s.create!.name))
    if (found) updates.push({ id: found.id, rank, ...(found.strip_label ? {} : { strip_label: s.label }) })
    else if (s.create) await createSacredPlaceWorkflow(container).run({ input: { ...s.create, strip_label: s.label, rank, visible: true } })
  }
  let rank = STRIP.length
  for (const p of places.filter((p) => !updates.some((u) => u.id === p.id))) updates.push({ id: p.id, rank: rank++ })
  if (updates.length) await updateSacredPlacesWorkflow(container).run({ input: updates })

  // 3. Hero slides (only when the admin hasn't made any).
  if (!(await container.resolve<HeroBannersModuleService>(HERO_BANNERS_MODULE).listHeroBanners({}, { select: ["id"] })).length) {
    for (const h of HERO) await createHeroBannerWorkflow(container).run({ input: { ...h, active: true } })
  }

  // 4. Journal drafts (unpublished).
  const journal = container.resolve<JournalModuleService>(JOURNAL_MODULE)
  for (const a of ARTICLES) {
    if (!(await journal.listArticles({ slug: a.slug }, { select: ["id"] })).length) {
      await createJournalArticleWorkflow(container).run({ input: { ...a, published: false } })
    }
  }
  logger.info("Anant Sanatan homepage content ready (categories, Sacred Nashik, hero slides, Journal drafts).")
}
