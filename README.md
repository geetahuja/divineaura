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
