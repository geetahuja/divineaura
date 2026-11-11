# DivineAura

**https://divineaura.com** — devotional e-commerce store for India — lockets, spiritual and gemstone bracelets, hand ties, malas and gift sets.

- **Storefront:** Next.js (App Router) + Tailwind — `apps/storefront`
- **Backend + admin:** Medusa v2 + PostgreSQL + Redis — `apps/backend`
- **Hosting:** Hostinger VPS (Nginx, PM2)

Start here: [`CLAUDE.md`](CLAUDE.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting started (Windows, PowerShell)

```powershell
git clone https://github.com/geetahuja/divineaura.git
cd divineaura
claude
```

Then ask Claude Code to start milestone 1 from `docs/ARCHITECTURE.md` §16.

## Run locally

Requires Node 22.22+ (below 25) and pnpm.

```powershell
pnpm install
# one-time: copy env files and fill them in
Copy-Item apps\backend\.env.example apps\backend\.env
Copy-Item apps\storefront\.env.example apps\storefront\.env.local
cd apps\backend; npx medusa db:migrate; cd ..\..   # first run only
pnpm dev   # backend :9000 (admin at /app) + storefront :8000
```

## Payments

Payment methods are pluggable (ARCHITECTURE.md §5.7): each one is a Medusa
payment provider in `apps/backend` plus one adapter in
`apps/storefront/src/lib/payments/`. Orders become **Paid** only when the
gateway's signed webhook is verified.

**Local testing without a gateway** — the development-only test payment:

```powershell
# apps\backend\.env
#   TEST_PAYMENT_ENABLED=true
#   TEST_PAYMENT_WEBHOOK_SECRET=<any long random string>
cd apps\backend
npx medusa exec ./src/scripts/sync-region-payment-providers.ts   # offer it in the India region
```

At checkout choose **Test payment (development only)** → *Pay successfully*,
*Fail payment* or *Cancel*. It refuses to run in production.

**Adding Razorpay (or Cashfree) later:** add its provider to `paymentProviders`
in `apps/backend/medusa-config.ts` with keys from `.env`, add
`razorpay.tsx` to `ADAPTERS` in `apps/storefront/src/lib/payments/index.tsx`,
register the webhook URL `https://api.divineaura.com/hooks/payment/<provider>`
in the gateway dashboard, then run the sync script above. Checkout itself does
not change.
