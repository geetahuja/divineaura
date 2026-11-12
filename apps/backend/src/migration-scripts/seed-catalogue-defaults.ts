import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createProductTagsWorkflow,
  createProductTypesWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductOptionsWorkflow,
  deleteProductsWorkflow,
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { createSacredPlaceWorkflow } from "../workflows/sacred-places"
import { upsertProductSpecsWorkflow } from "../workflows/upsert-product-specs"

// Milestone 3 catalogue defaults. Runs once (after initial-data-seed, scripts
// run in name order). Everything here is editable or deletable in the admin.

export const PRODUCT_TYPES = [
  { value: "Locket", sku_code: "LKT" },
  { value: "Bracelet", sku_code: "BRC" },
  { value: "Hand Tie", sku_code: "HTY" },
  { value: "Mala", sku_code: "MAL" },
  { value: "Gift Set", sku_code: "GFT" },
]
export const DEITIES = ["Shiva", "Hanuman", "Sai Baba", "Balaji", "Ganesha", "Krishna", "Ram", "Durga", "Lakshmi"]
export const INTENTIONS = ["Protection", "Prosperity", "Peace", "Focus & Confidence", "Devotion", "Gifting"]
export const FESTIVALS = [
  "Mahashivratri",
  "Hanuman Jayanti",
  "Guru Purnima",
  "Shravan",
  "Ram Navami",
  "Navratri",
  "Diwali",
  "Raksha Bandhan",
]

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

const SACRED_PLACES = [
  {
    name: "Trimbakeshwar Jyotirlinga",
    location: "Trimbak, Nashik",
    deity_tag: "deity:Shiva",
    description:
      "One of the twelve Jyotirlingas of Lord Shiva, set at the foot of the Brahmagiri hills near the source of the Godavari. Its linga bears three small faces, honouring Brahma, Vishnu and Shiva.",
  },
  {
    name: "Shri Saibaba Samadhi Mandir",
    location: "Shirdi",
    deity_tag: "deity:Sai Baba",
    description:
      "The shrine built over the resting place of Sai Baba, who lived in Shirdi until 1918. Devotees of many faiths come here for darshan and the daily aartis.",
  },
  {
    name: "Sri Venkateswara (Balaji) Temple",
    location: "Tirumala",
    deity_tag: "deity:Balaji",
    description:
      "The hill shrine of Lord Venkateswara, worshipped as Balaji, on the seven hills of Tirumala. It is among the most visited pilgrimage sites in the world.",
  },
  {
    name: "Shri Ram Janmabhoomi Mandir",
    location: "Ayodhya",
    deity_tag: "deity:Ram",
    description:
      "The temple at the birthplace of Lord Ram in Ayodhya, built in the Nagara style of temple architecture. The idol of Ram Lalla was consecrated in January 2024.",
  },
  {
    name: "Kalaram Mandir",
    location: "Panchavati, Nashik",
    deity_tag: "deity:Ram",
    description:
      "A temple to Lord Ram, Sita and Lakshman at Panchavati, named after its black-stone idol of Ram. Panchavati is associated with the years of exile told in the Ramayana.",
  },
  {
    name: "Tapovan",
    location: "Nashik",
    deity_tag: "deity:Ram",
    description:
      "A quiet stretch along the Godavari near Panchavati, linked in local tradition to Lord Ram, Sita and Lakshman's stay in the forest during their exile.",
  },
]

const DEMO_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]
const DEMO_CATEGORIES = ["Shirts", "Sweatshirts", "Pants", "Merch"]

export default async function seedCatalogueDefaults({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productService = container.resolve(Modules.PRODUCT)

  // 1. Remove the Medusa demo catalogue (present only on databases seeded before milestone 3).
  const demoProducts = await productService.listProducts({ handle: DEMO_HANDLES }, { select: ["id"] })
  if (demoProducts.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: demoProducts.map((p) => p.id) } })
  }
  const demoCategories = await productService.listProductCategories({ name: DEMO_CATEGORIES }, { select: ["id"] })
  if (demoCategories.length) {
    await deleteProductCategoriesWorkflow(container).run({ input: demoCategories.map((c) => c.id) })
  }
  const demoOptions = await productService.listProductOptions({ title: ["Size", "Color"] }, { select: ["id"] })
  if (demoOptions.length) {
    await deleteProductOptionsWorkflow(container).run({ input: { ids: demoOptions.map((o) => o.id) } })
  }

  // 2. Product types: GST override class + SKU type code.
  const { result: types } = await createProductTypesWorkflow(container).run({
    input: {
      product_types: PRODUCT_TYPES.map((t) => ({ value: t.value, metadata: { sku_code: t.sku_code } })),
    },
  })
  const typeId = (value: string) => types.find((t) => t.value === value)!.id

  // 3. Categories (navigation).
  const { result: topCategories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: ["Lockets", "Bracelets", "Hand Ties", "Malas", "Gift Sets"].map((name, rank) => ({
        name,
        handle: slug(name),
        is_active: true,
        rank,
      })),
    },
  })
  const bracelets = topCategories.find((c) => c.name === "Bracelets")!
  const { result: subCategories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: ["Spiritual", "Gemstone"].map((name, rank) => ({
        name,
        handle: `${slug(name)}-bracelets`,
        parent_category_id: bracelets.id,
        is_active: true,
        rank,
      })),
    },
  })
  const categoryId = (name: string) => [...topCategories, ...subCategories].find((c) => c.name === name)!.id

  // 4. Deity and intention tags. The readable name is the tag itself.
  const { result: tags } = await createProductTagsWorkflow(container).run({
    input: {
      product_tags: [
        ...DEITIES.map((d) => ({ value: `deity:${d}` })),
        ...INTENTIONS.map((i) => ({ value: `intention:${i}` })),
      ],
    },
  })
  const tagId = (value: string) => tags.find((t) => t.value === value)!.id

  // 5. Festival collections (empty until products are added).
  await createCollectionsWorkflow(container).run({
    input: { collections: FESTIVALS.map((title) => ({ title, handle: slug(title) })) },
  })

  // 6. Reusable variant options.
  const { result: options } = await createProductOptionsWorkflow(container).run({
    input: {
      product_options: [
        { title: "Bracelet size", values: ["S", "M", "L"] },
        { title: "Chain", values: ["With chain", "Without chain"] },
        { title: "Pack", values: ["Pack of 1", "Pack of 3", "Pack of 5"] },
      ],
    },
  })
  const optionId = (title: string) => options.find((o) => o.title === title)!.id

  // 7. Sample products, clearly marked, without photos.
  const {
    data: [shippingProfile],
  } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const {
    data: [salesChannel],
  } = await query.graph({ entity: "sales_channel", fields: ["id"] })
  const {
    data: [stockLocation],
  } = await query.graph({ entity: "stock_location", fields: ["id"] })

  const sampleNote = "Sample product — replace it with your own listing in the admin."
  const variant = (title: string, sku: string, options: Record<string, string>, price: number, mrp: number) => ({
    title,
    sku,
    options,
    prices: [{ currency_code: "inr", amount: price }],
    metadata: { mrp },
  })
  const base = {
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: shippingProfile.id,
    sales_channels: [{ id: salesChannel.id }],
  }

  // SEED_SAMPLE_PRODUCTS=false (production / staging server): no sample products.
  const { result: products } = process.env.SEED_SAMPLE_PRODUCTS === "false" ? { result: [] } : await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          ...base,
          title: "Sample – Hanuman Brass Locket",
          handle: "sample-hanuman-brass-locket",
          description: `${sampleNote} A brass locket bearing an image of Lord Hanuman, traditionally worn by devotees as a reminder of strength and devotion.`,
          type_id: typeId("Locket"),
          category_ids: [categoryId("Lockets")],
          tag_ids: [tagId("deity:Hanuman"), tagId("intention:Protection")],
          weight: 15,
          options: [{ id: optionId("Chain") }],
          variants: [
            variant("With chain", "DA-LKT-HAN-001", { Chain: "With chain" }, 599, 899),
            variant("Without chain", "DA-LKT-HAN-002", { Chain: "Without chain" }, 449, 649),
          ],
        },
        {
          ...base,
          title: "Sample – Seven Chakra Bracelet",
          handle: "sample-seven-chakra-bracelet",
          description: `${sampleNote} A bead bracelet in the seven colours associated with the chakras in yogic tradition.`,
          type_id: typeId("Bracelet"),
          category_ids: [categoryId("Spiritual")],
          tag_ids: [tagId("intention:Peace"), tagId("intention:Focus & Confidence")],
          weight: 25,
          options: [{ id: optionId("Bracelet size") }],
          variants: ["S", "M", "L"].map((size, i) =>
            variant(size, `DA-BRC-GEN-00${i + 1}`, { "Bracelet size": size }, 699, 999)
          ),
        },
        {
          ...base,
          title: "Sample – Tiger Eye Bracelet",
          handle: "sample-tiger-eye-bracelet",
          description: `${sampleNote} A bracelet of tiger eye beads, a stone traditionally associated with focus and confidence.`,
          type_id: typeId("Bracelet"),
          category_ids: [categoryId("Gemstone")],
          tag_ids: [tagId("intention:Focus & Confidence")],
          weight: 30,
          options: [{ id: optionId("Bracelet size") }],
          variants: ["S", "M", "L"].map((size, i) =>
            variant(size, `DA-BRC-GEN-00${i + 4}`, { "Bracelet size": size }, 899, 1299)
          ),
        },
        {
          ...base,
          title: "Sample – Sai Baba Hand Tie (Dhaga)",
          handle: "sample-sai-baba-hand-tie",
          description: `${sampleNote} A sacred thread tied on the wrist by devotees of Sai Baba as a sign of faith.`,
          type_id: typeId("Hand Tie"),
          category_ids: [categoryId("Hand Ties")],
          tag_ids: [tagId("deity:Sai Baba"), tagId("intention:Devotion")],
          weight: 5,
          options: [{ id: optionId("Pack") }],
          variants: [
            variant("Pack of 1", "DA-HTY-SAI-001", { Pack: "Pack of 1" }, 99, 149),
            variant("Pack of 3", "DA-HTY-SAI-002", { Pack: "Pack of 3" }, 249, 349),
            variant("Pack of 5", "DA-HTY-SAI-003", { Pack: "Pack of 5" }, 399, 549),
          ],
        },
      ],
    },
  })

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.id"],
  })
  const unstocked = inventoryItems.filter((i) => !i.location_levels?.length)
  if (unstocked.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: unstocked.map((i) => ({
          inventory_item_id: i.id,
          location_id: stockLocation.id,
          stocked_quantity: 25,
        })),
      },
    })
  }

  // 8. Sample DivineAura details (truthful placeholders, marked as samples).
  const specs: Record<string, Record<string, unknown>> = {
    "sample-hanuman-brass-locket": {
      material: "Brass, gold-plated (sample)",
      dimensions_mm: "25 × 18",
      weight_g: 12,
      care_instructions: "Keep dry. Wipe with a soft cloth.",
      mantra: "Om Hanumate Namah",
      country_of_origin: "India",
    },
    "sample-seven-chakra-bracelet": {
      material: "Assorted beads on elastic cord (sample)",
      stone_type: "Assorted beads",
      stone_origin: "dyed",
      bead_size_mm: 8,
      bead_count: 21,
      care_instructions: "Avoid water and perfume. Store separately.",
      country_of_origin: "India",
    },
    "sample-tiger-eye-bracelet": {
      material: "Tiger eye beads on elastic cord (sample)",
      stone_type: "Tiger eye",
      stone_origin: "natural",
      bead_size_mm: 8,
      bead_count: 21,
      care_instructions: "Avoid water and perfume. Store separately.",
      country_of_origin: "India",
    },
    "sample-sai-baba-hand-tie": {
      material: "Cotton thread (sample)",
      colour: "Red and yellow",
      length_cm: 30,
      care_instructions: "Tie with care; replace when worn.",
      country_of_origin: "India",
    },
  }
  for (const p of products) {
    await upsertProductSpecsWorkflow(container).run({
      input: { product_id: p.id, data: specs[p.handle] ?? {} },
    })
  }

  // 9. Stock location placeholder address (edit in Settings → Locations).
  await updateStockLocationsWorkflow(container).run({
    input: {
      selector: { id: stockLocation.id },
      update: {
        name: "DivineAura Warehouse",
        address: { address_1: "Address to be updated", city: "To be updated", country_code: "IN" },
      },
    },
  })

  // 10. Sacred Places, without images.
  for (const [rank, place] of SACRED_PLACES.entries()) {
    await createSacredPlaceWorkflow(container).run({ input: { ...place, rank, visible: true } })
  }

  logger.info("Seeded DivineAura catalogue defaults.")
}
