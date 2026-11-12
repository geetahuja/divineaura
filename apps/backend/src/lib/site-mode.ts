/**
 * SITE_MODE=staging|live (deploy/GO-LIVE.md). Development (NODE_ENV not
 * production) behaves like staging. Live refuses every test tool: the test
 * payment gateway, the test courier, and console "delivery" of messages/OTPs.
 * A production build without SITE_MODE counts as live (fail safe).
 */
export const siteMode = (env: NodeJS.ProcessEnv = process.env): "staging" | "live" => {
  if (env.SITE_MODE === "live") return "live"
  if (env.SITE_MODE === "staging" || env.NODE_ENV !== "production") return "staging"
  return "live"
}

export const testToolsAllowed = (env: NodeJS.ProcessEnv = process.env) => siteMode(env) === "staging"
