// URL slugs for tags and filter values (no server-only import: used by client filters too).
// "Sai Baba" → "sai-baba", "Focus & Confidence" → "focus-confidence".
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export type TagKind = "deity" | "intention"

// "deity:Sai Baba" → { kind: "deity", label: "Sai Baba", slug: "sai-baba" }
export const parseTag = (value: string) => {
  const i = value.indexOf(":")
  const kind = value.slice(0, i)
  const label = value.slice(i + 1).trim()
  if (i < 0 || !label || (kind !== "deity" && kind !== "intention")) {
    return null
  }
  return { kind: kind as TagKind, label, slug: slugify(label) }
}

export const tagHref = (value: string) => {
  const t = parseTag(value)
  return t ? `/${t.kind}/${t.slug}` : null
}
