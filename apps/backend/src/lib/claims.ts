import { MedusaError } from "@medusajs/framework/utils"

/**
 * Claims product and journal copy must never make (CLAUDE.md: describe beliefs
 * and traditions, never promise results; Goda Jal: no healing/purity/official
 * claims). Matched as whole words, case-insensitive, so "secure" or "cured
 * leather" style false positives stay rare; extend the list here only.
 */
export const BANNED_CLAIMS: { label: string; re: RegExp }[] = [
  { label: "guaranteed", re: /\bguarantee(d|s)?\b/i },
  { label: "cure", re: /\bcur(e|es|ed|ing)\b/i },
  { label: "heal", re: /\bheal(s|ed|ing|er|ers)?\b/i },
  { label: "100% results", re: /\b100\s*%\s*(result|success|effective)/i },
  { label: "pure", re: /\bpure(ly)?\b/i },
  { label: "purity", re: /\bpurity\b/i },
  { label: "official", re: /\bofficial(ly)?\b/i },
  { label: "government approved", re: /\bgov(ernmen)?t\.?\s*approved\b/i },
  { label: "same as Amrut Snan", re: /\bsame\s+as\s+(the\s+)?amrut\s+snan\b/i },
  { label: "guaranteed punya", re: /\bpunya\s+(is\s+)?(assured|certain)\b/i },
]

export function findBannedClaims(...texts: (string | null | undefined)[]): string[] {
  const text = texts.filter(Boolean).join("\n")
  return BANNED_CLAIMS.filter((c) => c.re.test(text)).map((c) => c.label)
}

/** Throws a 400 the admin shows as a toast. */
export function assertNoBannedClaims(what: string, ...texts: (string | null | undefined)[]) {
  const found = findBannedClaims(...texts)
  if (found.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${what} contains words we can't use: ${found.map((f) => `"${f}"`).join(", ")}. Describe beliefs and traditions instead of promising results.`
    )
  }
}
