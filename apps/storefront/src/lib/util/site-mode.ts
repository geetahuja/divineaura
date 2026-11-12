/**
 * SITE_MODE=staging|live, read at request time on the server (never baked into
 * the build). Development behaves like staging; a production server without
 * SITE_MODE counts as live. Same rule as the backend (src/lib/site-mode.ts).
 */
export const siteMode = (): "staging" | "live" =>
  process.env.SITE_MODE === "live" ? "live" : process.env.SITE_MODE === "staging" || process.env.NODE_ENV !== "production" ? "staging" : "live"
