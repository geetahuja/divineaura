import "server-only"
import { sdk } from "@lib/config"

export type ArticleSummary = { title: string; slug: string; excerpt: string | null; cover_image_url: string | null; cover_image_alt: string | null; published_at: string }
export type Article = ArticleSummary & { html: string; updated_at: string; seo_title: string | null; seo_description: string | null }

// Admin → Journal; refreshed every 5 minutes (scheduled articles appear within that).
const cached = { next: { revalidate: 300 }, cache: "force-cache" as const }

export const listArticles = () =>
  sdk.client.fetch<{ articles: ArticleSummary[] }>("/store/journal", cached).then((r) => r.articles).catch(() => [] as ArticleSummary[])

export const getArticle = (slug: string) =>
  sdk.client.fetch<{ article: Article }>(`/store/journal/${encodeURIComponent(slug)}`, cached).then((r) => r.article).catch(() => null)

export const formatArticleDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })
