import { model } from "@medusajs/framework/utils"

// Journal articles (Admin → Journal). Body is Markdown, rendered to safe HTML by
// the backend (lib/markdown). Shown on the storefront only when published and
// the publish date has arrived. Cover images only come from admin uploads.
const Article = model.define("journal_article", {
  id: model.id({ prefix: "art" }).primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  excerpt: model.text().nullable(),
  body: model.text(),
  cover_image_url: model.text().nullable(),
  cover_image_alt: model.text().nullable(),
  published: model.boolean().default(false),
  published_at: model.dateTime().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
})

export default Article
