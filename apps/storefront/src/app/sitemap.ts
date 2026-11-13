import { sdk } from "@lib/config"
import { categoryHref, listCategories, listTags } from "@lib/data/catalogue"
import { listArticles } from "@lib/data/journal"
import { getSiteOrigin } from "@lib/util/site"
import type { MetadataRoute } from "next"

const STATIC_PATHS = [
  "",
  "/shop",
  "/about",
  "/sacred-nashik",
  "/kumbh-special",
  "/journal",
  "/faq",
  "/contact",
  "/track-order",
  "/policies/shipping",
  "/policies/returns-refunds",
  "/policies/cancellation",
  "/policies/privacy",
  "/policies/terms",
  "/policies/grievance",
]
const PAGE_SIZE = 200

type Page<T> = { items: T[]; count: number }

async function listAll<T>(fetchPage: (offset: number) => Promise<Page<T>>) {
  const all: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { items, count } = await fetchPage(offset)
    all.push(...items)
    if (offset + PAGE_SIZE >= count || !items.length) {
      return all
    }
  }
}

type Entry = { handle?: string | null; updated_at?: string | Date | null }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const query = { fields: "handle,updated_at", limit: PAGE_SIZE }

  const [origin, products, cats, tags, collections, articles] = await Promise.all([
    getSiteOrigin(),
    listAll<Entry>((offset) =>
      sdk.store.product
        .list({ ...query, offset })
        .then((res) => ({ items: res.products, count: res.count }))
    ),
    listCategories(),
    listTags(),
    listAll<Entry>((offset) =>
      sdk.store.collection
        .list({ ...query, offset })
        .then((res) => ({ items: res.collections, count: res.count }))
    ),
    listArticles(),
  ])

  const toEntries = (base: string, prefix: string, items: Entry[]) =>
    items
      .filter((item) => item.handle)
      .map((item) => ({
        url: `${base}/${prefix}/${item.handle}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
      }))

  const base = origin
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    ...toEntries(base, "products", products),
    ...cats.map((c) => ({ url: `${base}${categoryHref(c, cats)}` })),
    ...tags.map((t) => ({ url: `${base}/${t.kind}/${t.slug}` })),
    ...toEntries(base, "collections", collections),
    ...articles.map((a) => ({ url: `${base}/journal/${a.slug}`, lastModified: new Date(a.published_at) })),
  ]
}
