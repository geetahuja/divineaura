# DivineAura — instructions for Claude Code

Read `docs/ARCHITECTURE.md` before starting any task. It is the source of truth for stack, structure, data model, business rules and build order.

## Project
- D2C devotional e-commerce store for India: lockets, spiritual & gemstone bracelets, hand ties, malas, gift sets.
- Monorepo: `apps/backend` (Medusa v2) and `apps/storefront` (Next.js App Router + Tailwind). TypeScript everywhere.
- Developer is on Windows using PowerShell — give Windows-compatible commands for local work.
- Production runs on a single Hostinger KVM VPS (Ubuntu) with Nginx, PM2, PostgreSQL and Redis — no Vercel. See ARCHITECTURE.md §18. Keep the code deployable there (Next.js with `next start`, Medusa server + worker).

## How to work
- Build one milestone from ARCHITECTURE.md §16 at a time. Show a short plan first, then implement, then tell me exactly how to run and test it.
- Prefer Medusa's built-in features and the official Next.js starter over custom code. Check current official docs for commands and APIs instead of guessing.
- Keep changes small and commit after each working step with a clear message.
- Never put secrets in code; use `.env` and keep `.env.example` updated.
- Ask me before adding a new paid service or a major dependency.

## Non-negotiable rules
- Production domain is **divinesanatani.com** (API at api.divinesanatani.com; brand name stays DivineAura). Never hard-code it: build every absolute URL from env variables (ARCHITECTURE.md §0).
- Prices, discounts, shipping, COD fee and taxes are calculated on the server only.
- Online orders are marked paid only from a verified Razorpay webhook; handlers are idempotent.
- Stock is rechecked when an order is placed.
- Product copy describes beliefs and traditions; never promise guaranteed money, health or life results.
- Gemstone descriptions must be truthful (natural / reconstituted / dyed).
- Mobile-first: every page must look right at 375 px wide.
- All customer messages and OTPs go through the messaging layer (ARCHITECTURE.md §19). Never call MSG91 or WhatsApp directly from features. "SMS" in §10 means "the configured channel".

## Brand
- Colours: maroon `#762019` (primary), gold `#C58A36` (accent), ivory `#FFF5E8` (background), champagne `#E8CDA9` (secondary surface).
- Serif headings, clean sans-serif body, rounded maroon buttons with white text, simple line icons.
- Devotional motifs only as subtle accents; never reduce readability of prices or buttons.
- Currency INR, format `₹1,299`; prices shown "Inclusive of all taxes".
