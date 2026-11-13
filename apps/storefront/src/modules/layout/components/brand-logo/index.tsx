import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Brand = { name: string; name_hi: string; tagline_en: string; tagline_hi: string }

/** Om inside an open lotus (line art). currentColor = gold on ivory, champagne on maroon. */
export function OmLotusMark({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M32 8c-6 6-8 13-8 20 0 6 3 11 8 14 5-3 8-8 8-14 0-7-2-14-8-20Z" />
      <path d="M24 30c-6-3-12-3-17-1 2 8 8 14 17 15M40 30c6-3 12-3 17-1-2 8-8 14-17 15" />
      <path d="M17 33c-5 1-9 4-12 8 6 5 15 6 27 3M47 33c5 1 9 4 12 8-6 5-15 6-27 3" />
      <path d="M10 52h44M16 56h32" strokeLinecap="round" />
      <text x="32" y="33" textAnchor="middle" fontSize="15" fill="currentColor" stroke="none" fontFamily="var(--font-deva), serif">ॐ</text>
    </svg>
  )
}

/**
 * Wordmark + taglines from Admin → Business details. `tone="dark"` = on maroon.
 * `compact` hides the taglines (checkout bar, small phones).
 */
export default function BrandLogo({ brand, tone = "light", compact = false, as = "link" }: { brand: Brand; tone?: "light" | "dark"; compact?: boolean; as?: "link" | "div" }) {
  const inner = (
    <>
      <OmLotusMark className={`${compact ? "h-9 w-9" : "h-10 w-10 small:h-14 small:w-14"} shrink-0 ${tone === "dark" ? "text-champagne" : "text-accent"}`} />
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
