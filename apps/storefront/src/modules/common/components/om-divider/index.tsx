/** Gold line – ॐ – line ornament used between headings and taglines. */
export default function OmDivider({ className = "", tone = "gold" }: { className?: string; tone?: "gold" | "champagne" }) {
  const c = tone === "gold" ? "text-accent" : "text-champagne"
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 ${c} ${className}`}>
      <span className="h-px w-16 bg-current opacity-70 small:w-28" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="font-deva text-2xl leading-none">ॐ</span>
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px w-16 bg-current opacity-70 small:w-28" />
    </div>
  )
}
