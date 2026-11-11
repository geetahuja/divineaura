import { model } from "@medusajs/framework/utils"

// Admin-editable content page (About, Contact, FAQ, policies). body is Markdown
// with {{placeholders}} filled from live settings when served.
const Page = model.define("content_page", {
  id: model.id({ prefix: "page" }).primaryKey(),
  slug: model.text().unique(),
  title: model.text(),
  body: model.text().default(""),
  faq: model.json().nullable(), // [{ q, a }] for the FAQ page
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  published: model.boolean().default(true),
})

export default Page
