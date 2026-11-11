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

**Cash on Delivery** (always available; switch on/off in Admin → **COD & payments**,
which also holds the COD fee, max COD order value, PIN-code blocklist, prepaid
discount % and the auto-cancel window). COD orders start as *Pending
confirmation*: the customer gets a signed link `/confirm/<token>` (through the
messaging layer — printed in the backend console in development), or staff confirm
by phone from Admin → **COD queue**. Unconfirmed orders are cancelled
automatically and their stock released. Needs `COD_CONFIRM_SECRET` and
`STOREFRONT_URL` in `apps\backend\.env`.

## Shipping

Couriers are pluggable (`apps/backend/src/lib/couriers/`). Without Shiprocket
credentials the development **test courier** is used (needs
`TEST_COURIER_WEBHOOK_SECRET`). Its rules: PIN codes starting with 9 aren't
serviceable; PIN codes ending in 99 have no COD; same first digit as the
warehouse = 2–4 days, otherwise 4–7. On an order in admin: **Mark packed**,
**Create shipment** (AWB + label), then **Simulate next tracking event** to move
it to Out for delivery → Delivered.

Set the warehouse address and **PIN code** in Admin → Settings → Locations (the
pickup address). Shiprocket switches on when `SHIPROCKET_EMAIL` and
`SHIPROCKET_PASSWORD` are set; its webhook settings (`SHIPROCKET_WEBHOOK_HEADER`,
`SHIPROCKET_WEBHOOK_TOKEN`) must be **verified with a real test shipment** before launch.
Free shipping is decided on the product subtotal after coupons (the COD fee and
the online-payment discount don't count).

**Adding Razorpay (or Cashfree) later:** add its provider to `paymentProviders`
in `apps/backend/medusa-config.ts` with keys from `.env`, add
`razorpay.tsx` to `ADAPTERS` in `apps/storefront/src/lib/payments/index.tsx`,
register the webhook URL `https://api.divineaura.com/hooks/payment/<provider>`
in the gateway dashboard, then run the sync script above. Checkout itself does
not change.

## Messaging, OTP login and emails (ARCHITECTURE.md §10, §11, §19)

- Features call only `sendMessage(event, recipient, data)` / `sendOtp(target, code)` (messaging module). All texts live in `apps/backend/src/modules/messaging/templates.ts`.
- `.env` decides delivery — no code change:
  - `MESSAGING_CHANNEL=console|sms|whatsapp|both`; email is added whenever the customer has an address (console until `RESEND_API_KEY` is set).
  - `OTP_CHANNEL=sms|whatsapp|sms_then_whatsapp` (resends after 30 s go by WhatsApp).
  - Fill `MSG91_*`, `SMS_TEMPLATE_IDS`, `WHATSAPP_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`. The live provider calls are marked **TO VERIFY WITH A REAL ACCOUNT**.
- Every send is in **Admin → Message log** (filter by order or mobile; recipients masked; OTP codes never stored). Each order page has a "Messages" link. One message per event per order per channel.
- Customers sign in at `/account` with mobile OTP (or email OTP). In development the code is printed in the backend terminal: `[sms → +91…] 123456 is your DivineAura login code…`. In production it is never printed.
- Needs `OTP_SECRET` in `apps/backend/.env` (long random string).

## Accounts, invoices, cancellations and returns (milestone 10)

- **Account** (`/account`, OTP login): Overview, Orders, Addresses (default is pre-filled at checkout), Wishlist (`/wishlist`; guests keep it in the browser, merged on login), Profile (name, email, marketing consent per channel).
- **GST invoices**: issued when an online payment is captured or a COD order is confirmed. Numbers `DA/26-27/00001` (consecutive per financial year, never reused); credit notes `CN/26-27/00001` for every refund / cancelled invoiced order. PDFs at signed links (`/documents/<token>`) on the account order page, the admin order page (Invoice & credit notes card) and in the shipped email.
- **Admin → Business details**: legal name, address, state, GSTIN, invoice prefixes, return window (also written to the region's `return_window_days`).
- **Cancel**: customers can cancel until the order is packed (stock released; prepaid refunded through the payment provider; COD simply cancelled).
- **Returns**: after delivery, within the return window; per-product "Not returnable" in the DivineAura details card. **Admin → Returns**: approve (books a reverse pickup) / reject → mark received → refund (prepaid automatically; COD: pay the customer's UPI / bank account, then "Mark refund paid"). Shipping and the COD fee are not refunded on returns.
- Needs `PAYOUT_ENCRYPTION_KEY` in `apps/backend/.env` (encrypts COD refund details; deleted once paid).
