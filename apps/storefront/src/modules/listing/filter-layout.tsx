"use client"

import type { Facets, FacetOption, Filters } from "@lib/listing"
import { SORTS } from "@lib/listing"
import { SlidersHorizontal, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useRef } from "react"

const isNumberInput = (t: EventTarget) => t instanceof HTMLInputElement && t.type === "number"

export type FilterGroup ="type" | "deity" | "intention" | "material"

const GROUPS: { key: FilterGroup; title: string }[] = [
  { key: "type", title: "Product type" },
  { key: "deity", title: "Deity" },
  { key: "intention", title: "Intention" },
  { key: "material", title: "Material / stone" },
]

// The <form> is the source of truth and works without JS (GET submit).
// With JS, every change rewrites the URL (shareable) without a full reload.
export default function FilterLayout({
  facets,
  filters,
  hide = [],
  total,
  activeCount,
  children,
}: {
  facets: Facets
  filters: Filters
  hide?: FilterGroup[]
  total: number
  activeCount: number
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sheet = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const apply = () => {
    const data = new FormData(formRef.current!)
    const params = new URLSearchParams()
    for (const key of Array.from(new Set(data.keys()))) {
      const values = data.getAll(key).map(String).filter(Boolean)
      if (values.length && !(key === "sort" && values[0] === "popular")) {
        params.set(key, values.join(","))
      }
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const group = (key: FilterGroup, title: string, options: FacetOption[]) =>
    !hide.includes(key) &&
    options.length > 0 && (
      <fieldset key={key} className="border-b border-champagne py-4">
        <legend className="mb-2 font-serif text-lg font-semibold text-primary">{title}</legend>
        <ul className="flex flex-col gap-2">
          {options.map((o) => (
            <li key={o.value}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name={key}
                  value={o.value}
                  defaultChecked={filters[key].includes(o.value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex-1">{o.label}</span>
                <span className="text-xs text-ink-muted">{o.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    )

  return (
    <div className="small:grid small:grid-cols-[240px_1fr] small:gap-10">
      <dialog
        ref={sheet}
        aria-label="Filters"
        className="m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-2xl bg-ivory p-0 text-ink backdrop:bg-ink/40 small:static small:!block small:max-h-none small:rounded-none small:bg-transparent"
      >
        <div className="flex items-center justify-between border-b border-champagne px-5 py-3 small:hidden">
          <span className="font-serif text-xl font-semibold text-primary">Filters</span>
          <button type="button" aria-label="Close filters" onClick={() => sheet.current?.close()} className="p-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* key resets defaultChecked/defaultValue when the URL changes (back button, links). */}
        <form
          key={JSON.stringify(filters)}
          id="filters"
          ref={formRef}
          method="get"
          // Price fields apply on blur / Enter, not on every keystroke.
          onChange={(e) => !isNumberInput(e.target) && apply()}
          onBlur={(e) => isNumberInput(e.target) && apply()}
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
          className="overflow-y-auto px-5 small:px-0"
        >
          {GROUPS.map((g) => group(g.key, g.title, facets[g.key]))}

          <fieldset className="border-b border-champagne py-4">
            <legend className="mb-2 font-serif text-lg font-semibold text-primary">Price (₹)</legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="min"
                min={0}
                inputMode="numeric"
                aria-label="Minimum price"
                placeholder={facets.price ? String(facets.price.min) : "Min"}
                defaultValue={filters.min ?? ""}
                className="h-10 w-full rounded-md border border-champagne bg-white px-3 text-base"
              />
              <span aria-hidden>–</span>
              <input
                type="number"
                name="max"
                min={0}
                inputMode="numeric"
                aria-label="Maximum price"
                placeholder={facets.price ? String(facets.price.max) : "Max"}
                defaultValue={filters.max ?? ""}
                className="h-10 w-full rounded-md border border-champagne bg-white px-3 text-base"
              />
            </div>
          </fieldset>

          <fieldset className="py-4">
            <legend className="sr-only">Availability</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="stock"
                value="in"
                defaultChecked={filters.inStock}
                className="h-4 w-4 accent-primary"
              />
              In stock only
            </label>
          </fieldset>
          <noscript>
            <button type="submit" className="mb-4 h-10 w-full rounded-full bg-primary text-white">Apply</button>
          </noscript>
        </form>
        <div className="sticky bottom-0 flex gap-3 border-t border-champagne bg-ivory px-5 py-3 small:hidden">
          <a href={pathname} className="flex h-11 flex-1 items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary">
            Clear all
          </a>
          <button
            type="button"
            onClick={() => sheet.current?.close()}
            className="h-11 flex-1 rounded-full bg-primary text-sm font-semibold text-white"
          >
            Show {total} {total === 1 ? "product" : "products"}
          </button>
        </div>
      </dialog>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="basis-full text-sm text-ink-soft small:basis-auto" aria-live="polite">
            {total} {total === 1 ? "product" : "products"}
          </p>
          <div className="flex w-full items-center gap-2 small:w-auto">
            <button
              type="button"
              onClick={() => sheet.current?.showModal()}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-primary px-4 text-sm font-semibold text-primary small:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select
              id="sort"
              name="sort"
              form="filters"
              defaultValue={filters.sort}
              key={filters.sort}
              onChange={apply}
              className="h-10 min-w-0 flex-1 rounded-full border border-champagne bg-white px-3 text-sm small:flex-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
