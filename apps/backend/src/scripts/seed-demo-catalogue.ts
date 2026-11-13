/**
 * STAGING ONLY — demo catalogue for the Anant Sanatan redesign (2026-11-13).
 * Every product is tagged "demo", has metadata.demo = true and shows
 * "Representative image" on the storefront. Remove them all before launch with
 * deploy/server/remove-demo-products.sh (deploy/GO-LIVE.md).
 *
 *   ssh divineaura "bash /var/www/divineaura/app/deploy/server/seed-demo-products.sh"
 *
 * Images: the AI placeholder crops in apps/storefront/public/placeholders are
 * uploaded through Medusa's file module (so they live in the uploads folder like
 * real photos). Re-running skips products that already exist (fixed handles).
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, createProductTagsWorkflow, createProductsWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import fs from "node:fs"
import path from "node:path"
import { testToolsAllowed } from "../lib/site-mode"
import { SACRED_PLACES_MODULE } from "../modules/sacred-places"
import type SacredPlacesModuleService from "../modules/sacred-places/service"
import { updateSacredPlacesWorkflow } from "../workflows/sacred-places"
import { upsertProductSpecsWorkflow } from "../workflows/upsert-product-specs"

export const DEMO_TAG = "demo"
export const PLACEHOLDER_CREDIT = "Representative AI illustration (placeholder)"

type Demo = {
  handle: string
  title: string
  description: string
  image: string // placeholders/<name>.jpg
  type: string
  category: string // handle
  tags: string[]
  collection?: string // handle
  option: "Bracelet size" | "Chain" | "Pack"
  variants: [string, number, number][] // option value, price, MRP
  weight: number
  specs: Record<string, unknown>
}

const NOTE = "Demo product for testing the store – not for sale."
const bracelet = (handle: string, title: string, image: string, cat: string, stone: string, origin: string, price: number, mrp: number, text: string, tags: string[]): Demo => ({
  handle, title, image, type: "Bracelet", category: cat, tags: ["bestseller", ...tags], option: "Bracelet size", weight: 30,
  description: `${NOTE} ${text}`,
  variants: (["S", "M", "L"] as const).map((s) => [s, price, mrp] as [string, number, number]),
  specs: { material: `${stone} beads on elastic cord (demo)`, stone_type: stone, stone_origin: origin, bead_size_mm: 8, bead_count: 22, care_instructions: "Avoid water and perfume. Store separately.", country_of_origin: "India" },
})
const locket = (deity: string, image: string, tags: string[], mantra: string): Demo => ({
  handle: `demo-${deity.toLowerCase().replace(/\s+/g, "-")}-locket`, title: `${deity} Locket`, image, type: "Locket", category: "lockets", tags, option: "Chain", weight: 15,
  description: `${NOTE} A gold-tone locket bearing ${deity === "Om" ? "the sacred syllable Om" : `an image of ${deity}`}, worn by devotees as a reminder of faith.`,
  variants: [["With chain", 649, 899], ["Without chain", 499, 699]],
  specs: { material: "Brass, gold-plated (demo)", dimensions_mm: "25 × 20", weight_g: 12, chain_included: true, mantra, care_instructions: "Keep dry. Wipe with a soft cloth.", country_of_origin: "India" },
})

const DEMOS: Demo[] = [
  locket("Om", "locket-om", ["intention:Devotion"], "Om"),
  locket("Shiva", "locket-shiva", ["deity:Shiva", "intention:Devotion"], "Om Namah Shivaya"),
  locket("Sai Baba", "locket-sai-baba", ["deity:Sai Baba", "intention:Devotion"], "Om Sai Ram"),
  locket("Balaji", "product-placeholder", ["deity:Balaji", "intention:Devotion"], "Om Namo Venkatesaya"),
  locket("Hanuman", "locket-hanuman", ["deity:Hanuman", "intention:Protection"], "Om Hanumate Namah"),
  bracelet("demo-seven-chakra-bracelet", "Seven Chakra Bracelet", "bracelet-seven-chakra", "spiritual-bracelets", "Assorted beads", "dyed", 999, 1499,
    "Beads in the seven colours linked with the chakras in yogic tradition.", ["intention:Peace"]),
  bracelet("demo-tiger-eye-bracelet", "Tiger Eye Bracelet", "bracelet-tiger-eye", "gemstone-bracelets", "Tiger eye", "natural", 799, 1199,
    "Tiger eye is traditionally associated with focus and confidence.", ["intention:Focus & Confidence"]),
  bracelet("demo-pyrite-bracelet", "Pyrite Bracelet", "bracelet-pyrite", "gemstone-bracelets", "Pyrite", "natural", 799, 1199,
    "Pyrite, with its golden shine, is traditionally kept as a symbol of prosperity.", ["intention:Prosperity"]),
  bracelet("demo-money-magnet-bracelet", "Money Magnet Bracelet", "bracelet-money-magnet", "spiritual-bracelets", "Green aventurine", "dyed", 899, 1299,
    "Called a “money magnet” bracelet in popular tradition. We describe the belief; we don't promise financial results.", ["intention:Prosperity"]),
  { ...bracelet("demo-rudraksha-bracelet", "Rudraksha Bracelet", "product-placeholder", "spiritual-bracelets", "Rudraksha", "natural", 599, 899,
    "Rudraksha beads are sacred to Lord Shiva and worn by his devotees.", ["deity:Shiva"]), tags: ["deity:Shiva", "intention:Devotion"] },
  {
    handle: "demo-sai-baba-dhaga", title: "Sai Baba Dhaga (Hand Tie)", image: "hand-tie-sai-baba", type: "Hand Tie", category: "hand-ties", tags: ["deity:Sai Baba", "intention:Devotion"], option: "Pack", weight: 5,
    description: `${NOTE} A red and yellow sacred thread with a Sai Baba charm, tied on the wrist as a sign of faith.`,
    variants: [["Pack of 1", 149, 199], ["Pack of 3", 349, 499]],
    specs: { material: "Cotton thread, brass charm (demo)", colour: "Red and yellow", length_cm: 30, care_instructions: "Tie with care; replace when worn.", country_of_origin: "India", not_returnable: true },
  },
  {
    handle: "demo-kalava-mauli", title: "Kalava / Mauli Sacred Thread", image: "hand-tie-kalava", type: "Hand Tie", category: "hand-ties", tags: ["intention:Protection"], option: "Pack", weight: 5,
    description: `${NOTE} The red and yellow kalava (mauli) tied on the wrist during puja and festivals.`,
    variants: [["Pack of 1", 99, 149], ["Pack of 5", 299, 449]],
    specs: { material: "Cotton thread (demo)", colour: "Red and yellow", length_cm: 30, care_instructions: "Replace when worn.", country_of_origin: "India", not_returnable: true },
  },
  {
    handle: "demo-kanthi-mala", title: "Tulsi Kanthi Mala", image: "product-placeholder", type: "Mala", category: "malas", tags: ["deity:Krishna", "intention:Devotion"], option: "Pack", weight: 10,
    description: `${NOTE} A kanthi mala of small tulsi beads, worn around the neck by devotees of Lord Krishna.`,
    variants: [["Pack of 1", 349, 499]],
    specs: { material: "Tulsi wood beads (demo)", bead_count: 108, care_instructions: "Keep dry.", country_of_origin: "India", not_returnable: true },
  },
  {
    handle: "demo-brass-puja-thali", title: "Brass Puja Thali Set", image: "category-puja-essentials", type: "Puja Essential", category: "puja-essentials", tags: ["intention:Devotion"], option: "Pack", weight: 450,
    description: `${NOTE} A brass thali with diya and incense holder for daily puja at home.`,
    variants: [["Pack of 1", 799, 1099]],
    specs: { material: "Brass (demo)", dimensions_mm: "250 diameter", weight_g: 420, care_instructions: "Clean with lemon and a soft cloth.", country_of_origin: "India" },
  },
  {
    handle: "demo-goda-jal-250ml", title: "Goda Jal (Godavari Water) – 250 ml", image: "goda-jal-bottle", type: "Goda Jal", category: "goda-jal", collection: "kumbh-special", tags: ["bestseller"], option: "Pack", weight: 300,
    description: `${NOTE} Water of the Godavari from Nashik, sealed in a 250 ml bottle for puja and snan at home. For religious/puja use only. Not for drinking or internal consumption.`,
    variants: [["Pack of 1", 199, 249], ["Pack of 3", 549, 699]],
    specs: { material: "Godavari river water in a sealed PET bottle (demo)", net_quantity: "250 ml", packed_on: "[MM/YYYY – from batch label]", liquid_fragile: true, weight_g: 290, care_instructions: "Store upright in a cool, clean place, away from sunlight.", country_of_origin: "India", not_returnable: true },
  },
  {
    handle: "demo-goda-jal-kumbh-gift-box", title: "Goda Jal Kumbh Gift Box", image: "goda-jal-gift-box", type: "Gift Set", category: "gift-sets", collection: "kumbh-special", tags: ["intention:Gifting"], option: "Pack", weight: 700,
    description: `${NOTE} A gift box with Goda Jal (250 ml), a kalava and a brass diya, for families who can't travel to the Kumbh. Goda Jal is for religious/puja use only.`,
    variants: [["Pack of 1", 1499, 1999]],
    specs: { material: "Goda Jal 250 ml, cotton kalava, brass diya (demo)", net_quantity: "1 box (250 ml Goda Jal)", liquid_fragile: true, weight_g: 650, care_instructions: "Store the bottle upright.", country_of_origin: "India", not_returnable: true },
  },
]

// Sacred place → placeholder image (staging only; credit marks it as an AI illustration).
const PLACE_IMAGES: Record<string, string> = {
  "Kalaram Mandir": "place-kalaram-mandir",
  "Ram Ghat (Ramkund)": "place-ram-ghat",
  "Dutondya Maruti Mandir": "place-dutondya-maruti",
  "Trimbakeshwar Jyotirlinga": "place-trimbakeshwar",
  Brahmagiri: "place-brahmagiri",
  Tapovan: "place-tapovan",
  "Shri Balaji Mandir, Nashik": "place-balaji",
}

/** apps/storefront/public/placeholders, found from here (src/ or .medusa/server/src/). */
function placeholdersDir() {
  for (let dir = __dirname; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const p = path.join(dir, "apps", "storefront", "public", "placeholders")
    if (fs.existsSync(p)) return p
    const sibling = path.join(dir, "storefront", "public", "placeholders")
    if (fs.existsSync(sibling)) return sibling
  }
  throw new MedusaError(MedusaError.Types.NOT_FOUND, "apps/storefront/public/placeholders not found")
}

export default async function seedDemoCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!testToolsAllowed()) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Demo products are for staging only (SITE_MODE=live).")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const products = container.resolve(Modules.PRODUCT)
  const dir = placeholdersDir()

  const uploaded = new Map<string, string>()
  const upload = async (name: string) => {
    if (uploaded.has(name)) return uploaded.get(name)!
    const { result } = await uploadFilesWorkflow(container).run({
      input: { files: [{ filename: `${name}.jpg`, mimeType: "image/jpeg", content: fs.readFileSync(path.join(dir, `${name}.jpg`)).toString("base64"), access: "public" }] },
    })
    uploaded.set(name, result[0].url)
    return result[0].url
  }

  const existing = new Set((await products.listProducts({ handle: DEMOS.map((d) => d.handle) }, { select: ["handle"] })).map((p) => p.handle))
  const todo = DEMOS.filter((d) => !existing.has(d.handle))

  // Lookups: tags (create missing), categories, types, collections, options, channel, profile, location.
  const tagValues = [...new Set([DEMO_TAG, ...DEMOS.flatMap((d) => d.tags)])]
  const tags = await products.listProductTags({ value: tagValues }, { select: ["id", "value"] })
  const missingTags = tagValues.filter((v) => !tags.some((t) => t.value === v))
  if (missingTags.length) tags.push(...(await createProductTagsWorkflow(container).run({ input: { product_tags: missingTags.map((value) => ({ value })) } })).result)
  const cats = await products.listProductCategories({ handle: [...new Set(DEMOS.map((d) => d.category))] }, { select: ["id", "handle"] })
  const types = await products.listProductTypes({}, { select: ["id", "value"] })
  const cols = await products.listProductCollections({ handle: ["kumbh-special"] }, { select: ["id", "handle"] })
  const opts = await products.listProductOptions({ title: ["Bracelet size", "Chain", "Pack"] }, { select: ["id", "title"] })
  const need = <T,>(v: T | undefined, what: string): T => {
    if (!v) throw new MedusaError(MedusaError.Types.NOT_FOUND, `${what} is missing — run db:migrate first.`)
    return v
  }
  const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const { data: [channel] } = await query.graph({ entity: "sales_channel", fields: ["id"] })
  const { data: [location] } = await query.graph({ entity: "stock_location", fields: ["id"] })

  for (const d of todo) {
    const image = await upload(d.image)
    const {
      result: [p],
    } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: d.title,
            handle: d.handle,
            description: d.description,
            status: ProductStatus.PUBLISHED,
            thumbnail: image,
            images: [{ url: image }],
            weight: d.weight,
            metadata: { demo: true },
            shipping_profile_id: profile.id,
            sales_channels: [{ id: channel.id }],
            type_id: need(types.find((t) => t.value === d.type), `Product type "${d.type}"`).id,
            category_ids: [need(cats.find((c) => c.handle === d.category), `Category "${d.category}"`).id],
            collection_id: d.collection ? need(cols.find((c) => c.handle === d.collection), `Collection "${d.collection}"`).id : undefined,
            tag_ids: [DEMO_TAG, ...d.tags].map((v) => need(tags.find((t) => t.value === v), `Tag "${v}"`).id),
            options: [{ id: need(opts.find((o) => o.title === d.option), `Option "${d.option}"`).id }],
            variants: d.variants.map(([value, price, mrp], i) => ({
              title: value,
              sku: `AS-DEMO-${d.handle.replace(/^demo-/, "").slice(0, 18).toUpperCase()}-${i + 1}`,
              options: { [d.option]: value },
              prices: [{ currency_code: "inr", amount: price }],
              metadata: { mrp },
            })),
          },
        ],
      },
    })
    await upsertProductSpecsWorkflow(container).run({ input: { product_id: p.id, data: d.specs } })
    logger.info(`demo: ${d.title}`)
  }

  // Stock for every demo variant without a level yet.
  const { data: items } = await query.graph({ entity: "inventory_item", fields: ["id", "sku", "location_levels.id"] })
  const unstocked = items.filter((i) => i.sku?.startsWith("AS-DEMO-") && !i.location_levels?.length)
  if (unstocked.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: unstocked.map((i) => ({ inventory_item_id: i.id, location_id: location.id, stocked_quantity: 50 })) },
    })
  }

  // Sacred places without a photo get a placeholder illustration.
  const places = await container.resolve<SacredPlacesModuleService>(SACRED_PLACES_MODULE).listSacredPlaces({ image_url: null })
  const updates: { id: string; image_url: string; image_credit: string }[] = []
  for (const p of places) if (PLACE_IMAGES[p.name]) updates.push({ id: p.id, image_url: await upload(PLACE_IMAGES[p.name]), image_credit: PLACEHOLDER_CREDIT })
  if (updates.length) await updateSacredPlacesWorkflow(container).run({ input: updates })

  logger.info(`Demo catalogue: ${todo.length} products created (${existing.size} already there), ${updates.length} place images.`)
}
