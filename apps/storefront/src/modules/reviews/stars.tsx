import { Star } from "lucide-react"

// Read-only star rating in brand gold (supports halves visually by rounding to the nearest star).
export default function Stars({ value, size = "h-4 w-4", label }: { value: number; size?: string; label?: string }) {
  const full = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= full ? "fill-accent" : "fill-transparent"}`} aria-hidden strokeWidth={1.5} />
      ))}
    </span>
  )
}
