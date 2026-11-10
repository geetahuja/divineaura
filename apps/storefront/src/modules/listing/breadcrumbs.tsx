import { toJsonLd } from "@lib/util/product-structured-data"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Crumb = { label: string; href: string }

// Visible trail + BreadcrumbList JSON-LD (ARCHITECTURE.md §13). Last crumb = current page.
export default function Breadcrumbs({ items, origin }: { items: Crumb[]; origin: string }) {
  const all = [{ label: "Home", href: "/" }, ...items]
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${origin}${c.href === "/" ? "" : c.href}`,
    })),
  }
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            {i === all.length - 1 ? (
              <span aria-current="page" className="text-ink-soft">{c.label}</span>
            ) : (
              <LocalizedClientLink href={c.href} className="hover:text-primary hover:underline">
                {c.label}
              </LocalizedClientLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
