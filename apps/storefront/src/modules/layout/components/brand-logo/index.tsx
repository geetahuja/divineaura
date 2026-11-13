import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Brand = { name: string; name_hi: string; tagline_en: string; tagline_hi: string }

/**
 * Wordmark + taglines from Admin → Business details. `tone="dark"` = on maroon.
 * `compact` hides the taglines (checkout bar, small phones).
 */
export default function BrandLogo({ brand, tone = "light", compact = false, as = "link" }: { brand: Brand; tone?: "light" | "dark"; compact?: boolean; as?: "link" | "div" }) {
  const inner = (
    <>
      {/* Round AS emblem (maroon + gold) reads on both ivory and maroon. Decorative: the name is text beside it. */}
      <Image src="/brand/logo-emblem.png" alt="" width={56} height={56} className={`${compact ? "h-9 w-9" : "h-10 w-10 small:h-14 small:w-14"} shrink-0`} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif font-semibold uppercase tracking-[0.08em] ${compact ? "text-lg" : "text-[1.05rem] small:text-[1.7rem]"} ${tone === "dark" ? "text-white" : "text-primary"}`}>
          {brand.name}
        </span>
        {!compact && (
          <>
            {brand.tagline_en && <span className={`mt-1 font-serif text-[0.7rem] small:text-xs ${tone === "dark" ? "text-champagne" : "text-ink-soft"}`}>{brand.tagline_en}</span>}
            {brand.tagline_hi && (
              <span lang="hi" className={`mt-0.5 font-deva text-[0.65rem] small:text-[0.7rem] ${tone === "dark" ? "text-ivory" : "text-primary"}`}>
                {brand.tagline_hi}
              </span>
            )}
          </>
        )}
      </span>
    </>
  )
  const cls = "flex items-center gap-2 small:gap-3"
  return as === "div" ? (
    <div className={cls}>{inner}</div>
  ) : (
    <LocalizedClientLink href="/" className={cls} aria-label={`${brand.name} – home`} data-testid="nav-store-link">
      {inner}
    </LocalizedClientLink>
  )
}
