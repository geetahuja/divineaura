# Anant Sanatan — Website Architecture (v1)

> Build spec for the Anant Sanatan e-commerce website (renamed from DivineAura on 2026-11-13; internal names such as the repo, server paths and database keep `divineaura`). Hand this to Claude Code.
> Scope: **website only** (phase 1). Android/iOS apps come later and will reuse the same backend.
> Where a command, package name or API may have changed, check the current official docs before using it.

---

## 0. Domain (fixed)

The production domain is **divinesanatani.com** (brand: **Anant Sanatan**, अनंत सनातन — "a brand of Jayshankar Enterprises"; name and taglines "Beyond Eternity, Beyond Time." / "समय से पहले, समय के बाद भी।" are edited in Admin → Business details). Everything is built around it:

| Host | Purpose |
| --- | --- |
| `https://divinesanatani.com` | Storefront (canonical URL) |
| `https://www.divinesanatani.com` | 301 redirect to `https://divinesanatani.com` |
| `https://api.divinesanatani.com` | Medusa API |
| `https://api.divinesanatani.com/app` | Medusa admin panel |
| `orders@divinesanatani.com`, `support@divinesanatani.com`, `noreply@divinesanatani.com` | Email (order emails sent from `noreply@`, replies to `support@`) |

Rules so the domain never has to be changed in code:
- The domain appears **only in environment variables** (`NEXT_PUBLIC_SITE_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `MEDUSA_BACKEND_URL`, `COOKIE_DOMAIN`), never hard-coded in components, templates or emails. Build all absolute URLs (canonical tags, sitemap, Open Graph, invoice links, SMS/WhatsApp links, email links) from `NEXT_PUBLIC_SITE_URL`.
- Development uses `http://localhost:8000` (storefront) and `http://localhost:9000` (backend) through the same variables.
- Webhook URLs to register at go-live: `https://api.divinesanatani.com/hooks/payment/razorpay_razorpay` and `https://api.divinesanatani.com/hooks/shipping/shiprocket` (see `deploy/GO-LIVE.md`).
- `divinesanatani.com` must be whitelisted on the DLT portal (for links inside SMS), verified in Meta Business (WhatsApp), set up in the email service with SPF, DKIM and DMARC records, and verified in Google Search Console.
- Recommended: also register `divinesanatani.in` and 301-redirect it to `divinesanatani.com` to protect the brand.

---

## 1. Product summary

Anant Sanatan is a D2C store in India, rooted in Nashik, selling its own devotional products:

- **God lockets** — Shiva, Hanuman, Sai Baba, Balaji, etc.
- **Spiritual bracelets** — Seven Chakra, Money Magnet, etc.
- **Gemstone bracelets** — Pyrite, Tiger Eye, etc.
- **Hand ties** — Sai Baba dhaga, sacred threads
- **Malas** — Kanthi mala, japa malas
- **Puja essentials** — thalis, diyas
- **Goda Jal (Godavari Water)** — Kumbh Special; religious/puja use only, Legal Metrology declarations on the page, packed by a licensed packer
- **Gift sets / combos**

Core journey: **discover → product page → cart → checkout (prepaid or COD) → track order.**

Goals for v1:
1. Fast, mobile-first, SEO-friendly storefront (most traffic will be on phones).
2. Guest checkout with UPI / cards / net banking (Razorpay) and Cash on Delivery.
3. Shipping and tracking through Shiprocket.
4. An admin panel to manage products, stock and orders (provided by Medusa).

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript everywhere |
| Storefront | Next.js (App Router) + React + Tailwind CSS |
| Commerce backend | Medusa v2 (Node.js) — products, cart, orders, inventory, promotions, returns, admin |
| Database | PostgreSQL 16, installed on the VPS |
| Cache / events | Redis, installed on the VPS (needed by Medusa in production) |
| Payments | Razorpay (UPI, cards, net banking) + COD (custom provider) |
| Shipping | Shiprocket |
| Email | Resend (or SendGrid) |
| Messaging | Channel-agnostic messaging layer (§19) with three providers: `console` (dev), `sms` (MSG91, DLT) and `whatsapp` (Meta WhatsApp Cloud API or MSG91 WhatsApp). Channel chosen by config; final choice made later by the owner. |
| Images | Stored on the VPS disk via Medusa's local file provider (`/var/www/divineaura/uploads`), served by Nginx with long cache headers; `next/image` on the storefront. No third-party image service. |
| Hosting | **One Hostinger KVM VPS (Ubuntu, India data centre)** running everything — see §18. No Vercel. |
| Process manager | PM2 (or Docker Compose) to keep Next.js and Medusa running and restart them on crash/reboot |
| Web server / SSL | Nginx reverse proxy + free Let's Encrypt SSL (Certbot) |
| CDN / protection | None (not used). DNS at the domain registrar pointing straight to the VPS. Nginx handles caching and rate limiting. |
| Analytics | Google Analytics 4 + Meta Pixel (with consent) |
| Errors | Sentry (storefront + backend) |

---

## 3. Repository structure (monorepo)

```
divineaura/
├── CLAUDE.md                  # rules Claude Code reads every session
├── docs/
│   └── ARCHITECTURE.md        # this file
├── apps/
│   ├── backend/               # Medusa v2 server + admin
│   │   ├── src/
│   │   │   ├── modules/       # custom modules (product-specs, reviews, wishlist)
│   │   │   ├── links/         # module links (e.g. product ↔ product-specs)
│   │   │   ├── providers/     # razorpay payment, cod payment, shiprocket fulfillment, notifications
│   │   │   ├── workflows/     # cod-confirmation, order-notifications, gst-invoice
│   │   │   ├── subscribers/   # react to order.placed, shipment.created, etc.
│   │   │   ├── api/           # custom routes (pincode check, reviews, razorpay webhook)
│   │   │   ├── jobs/          # scheduled jobs (auto-cancel unconfirmed COD, tracking sync)
│   │   │   └── admin/         # admin UI extensions (specs editor, COD confirm button)
│   │   └── medusa-config.ts
│   └── storefront/            # Next.js site
│       ├── src/
│       │   ├── app/           # routes (see §6); [countryCode] segment is internal only — proxy.ts serves unprefixed URLs
│       │   ├── modules/       # UI by feature (layout, products, cart, checkout…), kept from the Medusa starter
│       │   ├── lib/
│       │   │   ├── data/      # SDK data functions (products, cart, orders)
│       │   │   ├── util/      # money formatting (INR), store policies, site URL helpers
│       │   │   └── nav.ts     # main menu + footer links
│       │   ├── styles/
│       │   └── proxy.ts       # Next 16 proxy (formerly middleware): /x → /in/x rewrite
│       └── tailwind.config.js # brand tokens (§8)
├── packages/                  # (later) shared types/API client for the Expo apps
└── products.csv               # initial catalogue import
```

Scaffold with Medusa's official installer and its Next.js starter storefront, then restructure into this layout and re-theme. Don't build cart/checkout logic from scratch when the starter already has it.

---

## 4. Catalogue model

Every product is tagged three ways so the same catalogue can be browsed by **deity**, **intention** or **product type**.

| Concept | Medusa feature | Examples |
| --- | --- | --- |
| Product type (main menu) | **Product categories** (tree) | Lockets, Bracelets › Spiritual, Bracelets › Gemstone, Hand Ties, Malas, Gift Sets |
| Deity | **Product tags** prefixed `deity:` | `deity:shiva`, `deity:hanuman`, `deity:sai-baba`, `deity:balaji` |
| Intention | **Product tags** prefixed `intention:` | `intention:protection`, `intention:prosperity`, `intention:peace`, `intention:focus`, `intention:devotion` |
| Festival / campaign | **Product collections** | Mahashivratri, Hanuman Jayanti, Guru Purnima, Shravan, Navratri, Diwali, Raksha Bandhan |
| Size / pack quantity | **Product options + variants** | Bracelet size S/M/L; thread pack of 1/3/5 |

### Product specs (custom module `product-specs`, linked 1:1 to product)

| Field | Type | Applies to |
| --- | --- | --- |
| material | string | all (e.g. "Brass, gold-plated", "Natural Tiger Eye") |
| stone_type | string? | bracelets, malas |
| stone_origin_note | string? | gemstones (natural / reconstituted / dyed — must be truthful) |
| bead_size_mm | number? | bracelets, malas |
| bead_count | number? | malas, bracelets |
| length_cm | number? | bracelets, threads, malas, chains |
| dimensions_mm | string? | lockets (e.g. "25 × 18") |
| weight_g | number | all (also used for shipping) |
| chain_included | boolean? | lockets |
| colour | string? | threads |
| pack_quantity | number? | threads |
| care_instructions | text | all |
| mantra | text? | deity products (shown on page + printed card) |
| certificate_url | string? | gemstones with a lab certificate |
| country_of_origin | string | all (legal requirement) |
| hsn_code | string | all (GST invoice) |
| gst_rate | number | all — *not stored in specs*: a Medusa tax-rate override (Tax Regions → India; default 3 %). Editable in the "Product details & specs" panel; blank = default |

Plus standard Medusa fields: title, handle (URL slug), description, images, SKU per variant, price in INR, compare-at price (MRP), inventory quantity.

---

## 5. Business rules (enforce on the server, never trust the browser)

1. **Prices, discounts, shipping fees, COD fee and taxes are calculated in the backend.** The storefront only displays them.
2. **Stock is rechecked when the order is placed.** No overselling.
3. **Prices are GST-inclusive** (shown as "Inclusive of all taxes"). MRP shown struck through when a sale price exists.
4. **Shipping:** free above a configurable threshold (env/setting, e.g. ₹499); flat fee below it.
5. **COD rules (configurable):**
   - COD fee (e.g. ₹49), max COD order value (e.g. ₹3,000), COD disabled for a blocklist of PIN codes.
   - COD orders start in status **Pending confirmation**. Customer gets an SMS with a short confirm link (`/confirm/[token]`); tapping it confirms the order.
   - Confirmed → normal fulfilment. Not confirmed in 24 h → auto-cancel (scheduled job) and restock.
   - Admin can confirm manually by phone (button in admin).
6. **Prepaid incentive:** a percentage discount (e.g. 5 %) applied automatically when the payment method is online. Implemented as a Medusa promotion with a payment-method rule, or as a custom adjustment in checkout.
7. **Online payments are confirmed only by a verified Razorpay webhook** (signature checked). The browser redirect alone never marks an order as paid. Webhook handling must be idempotent (no duplicate orders).
8. **Order status timeline** (shown to customer): Placed → Confirmed → Packed → Shipped → Out for delivery → Delivered (plus Cancelled / Return requested / Refunded). Every change is stored with a timestamp.
9. **PIN-code check** on product page and checkout: calls a backend route that asks Shiprocket for serviceability, estimated delivery date and COD availability.
10. **Reviews** can only be posted by customers with a delivered order for that product (verified buyer badge). Admin approves before publishing. Photo uploads allowed.
11. **GST invoice** (PDF) generated for every order with seller GSTIN, HSN codes and tax split (CGST+SGST or IGST by state). Downloadable from the order page and attached to the shipped email.
12. **Spiritual claims:** product copy describes traditions and beliefs, never guaranteed results (money, health, success). No "guaranteed", "cures", "100 % results".

---

## 6. Storefront routes (Next.js App Router)

| Route | Page | Rendering |
| --- | --- | --- |
| `/` | Homepage | Static + revalidate (ISR) |
| `/shop` | All products, filters + sort | ISR, filters via search params |
| `/category/[...slug]` | Product type (e.g. `/category/bracelets/gemstone`) | ISR |
| `/deity/[slug]` | Shop by deity | ISR |
| `/intention/[slug]` | Shop by intention | ISR |
| `/collections/[slug]` | Festival / campaign collection | ISR |
| `/products/[handle]` | Product details | ISR |
| `/search?q=` | Search results | Dynamic |
| `/cart` | Cart | Dynamic |
| `/checkout` | One-page checkout | Dynamic |
| `/order/confirmed/[id]` | Order success | Dynamic |
| `/track-order` | Track by order ID + phone | Dynamic |
| `/account` | Login / orders / addresses / profile | Dynamic, protected |
| `/account/orders/[id]` | Order detail + timeline + invoice + return request | Dynamic, protected |
| `/wishlist` | Wishlist (local for guests, synced for logged-in) | Dynamic |
| `/about` ("Our story"), `/contact`, `/faq` | Content pages | Static |
| `/sacred-nashik` | Sacred Nashik skyline + place cards (Admin → Sacred Places) | ISR |
| `/kumbh-special` | Kumbh Special / Goda Jal landing (collection `kumbh-special`) | ISR |
| `/journal`, `/journal/[slug]` | Journal articles (Admin → Journal) | ISR |
| `/policies/[slug]` | shipping, returns-refunds, cancellation, privacy, terms, grievance | Static |
| `/sitemap.xml`, `/robots.txt` | SEO | Generated |

**Filters on listing pages:** price range, product type, deity, intention, material/stone, availability. **Sort:** popular, newest, price ↑, price ↓.

**Search:** start with Medusa's product search (title/description/tags). Add Meilisearch or Algolia later if needed.

---

## 7. Key UI components

- **Layout:** `Header` (logo, search, account, wishlist, cart count), `MegaMenu` (Shop by Deity / Bracelets / Lockets / Malas & Threads / Gifts / Offers), `MobileBottomBar` (Home · Shop · Search · Cart · Account), `Footer` (contact, policies, social, newsletter), `AnnouncementBar` (offer / free shipping).
- **Homepage sections (in order, "Option A" design, 2026-11-13):** maroon top bar (free-shipping threshold) → header (round AS emblem logo, wordmark + English/Hindi taglines; Home | Shop ▾ | Goda Jal | Kumbh Special | Sacred Nashik ▾ | Our Story | Journal | Contact) → `Hero` carousel (Admin → Hero banners, all live slides; design v2: full-bleed photo under a header that is transparent until scrolled, italic heading between Om and lotus ornaments, optional photo caption bottom-left, outline button bottom-right; `{{brand}}` in slide text = brand name) → `CategoryCards` → `KumbhBand` (Goda Jal + Amrut Snan countdown from Business details) → `SacredNashikStrip` (SVG skyline, labels link to places) → Featured products (tag `bestseller`) → `TrustStrip` → maroon footer. Mobile bottom bar: Home · Shop · Cart · Orders · Account.
- **Listing:** `ProductGrid`, `ProductCard` (image, name, price, MRP, discount %, rating, wishlist heart, quick add), `FilterSidebar` / `FilterSheet` (mobile), `SortSelect`, `Breadcrumbs`.
- **Product page:** `ImageGallery` (zoom, swipe, video support), `PriceBlock`, `VariantSelector`, `QuantitySelector`, `AddToCart` + `BuyNow`, `PincodeChecker`, `SpecsTable`, `MantraCard`, `SizeGuide` (bracelets), `ReviewsSection`, `RelatedProducts`, sticky add-to-cart bar on mobile.
- **Cart & checkout:** `CartDrawer`, `CartLineItem`, `CouponInput`, `OrderSummary`, `AddressForm` (PIN code auto-fills city/state), `PaymentMethodPicker` (UPI / Card / Net banking / COD with fee + prepaid saving shown), `GiftOptions` (wrap + message).
- **Order:** `OrderTimeline`, `InvoiceDownload`, `ReturnRequestForm`.
- **Shared:** `Button`, `Badge`, `Rating`, `Price`, `Modal`, `Sheet`, `Toast`, `Skeleton`, `EmptyState`.

---

## 8. Design system

| Token | Value |
| --- | --- |
| `primary` (deep maroon) | `#762019` |
| `accent` (warm gold) | `#C58A36` |
| `background` (ivory) | `#FFF5E8` |
| `surface-2` (champagne) | `#E8CDA9` |
| Text | near-black on ivory; ensure WCAG AA contrast |
| Headings | elegant serif (e.g. Cormorant Garamond or Playfair Display via `next/font`) |
| Body | clean sans-serif (e.g. Inter or Mulish via `next/font`) |
| Buttons | maroon fill, white text, rounded corners; gold for secondary accents |
| Icons | simple line icons (e.g. Lucide) in maroon or gold |
| Photography | product on warm ivory background, consistent light; one in-hand/on-wrist shot per product |

Devotional motifs (lotus, subtle mandala) only as light accents — never behind text or prices. Mobile-first: design at 375 px, then scale up.

---

## 9. Checkout flow

1. Contact: **mobile number** (required), email (optional but recommended), name.
2. Address: PIN code first → auto-fill city/state → serviceability + delivery date + COD availability shown.
3. Shipping method: standard (free above threshold).
4. Payment method:
   - **Online (UPI / card / net banking)** → prepaid discount shown → Razorpay Checkout opens → on success, wait for webhook → order confirmation page.
   - **COD** (if eligible) → COD fee shown → order placed as *Pending confirmation* → SMS with confirm link sent.
5. Review & place order (policies link + acknowledgement).
6. Confirmation page: order number, summary, payment status, "Track order" link; email + SMS sent.

Failed / abandoned online payment: cart is preserved, customer can retry or switch to COD.

---

## 10. Order lifecycle & notifications

| Event | Trigger | Customer gets |
| --- | --- | --- |
| Order placed (prepaid) | Razorpay webhook verified | Email + SMS: confirmation |
| Order placed (COD) | Order created | SMS: "Tap link to confirm your COD order" |
| COD confirmed | Customer taps confirm link or admin button | Email + SMS: confirmed |
| Packed | Admin marks packed / creates shipment | — |
| Shipped | Shiprocket AWB created | Email (with invoice) + SMS: tracking link |
| Out for delivery / Delivered | Shiprocket tracking webhook or scheduled sync | SMS |
| Cancelled / refunded | Admin or auto-cancel job | Email + SMS |
| Abandoned cart (opted-in only) | Cart idle 1 h with contact info | Email reminder (phase 2); SMS only with promotional consent |

---

## 11. Accounts & auth

- **v1:** guest checkout (no login needed to buy).
- **v1:** customer accounts use **mobile-number OTP login** via a custom Medusa auth provider + MSG91 SMS. 6-digit OTP, 5-minute expiry, max 3 resends, rate-limited per number and IP; Web OTP API autofill on Android. Email OTP as fallback. Past guest orders are linked by phone number.
- **Payment OTPs are NOT sent by Anant Sanatan.** UPI uses the customer's UPI PIN in their app; card OTPs are sent by the customer's bank via Razorpay. The site only sends login OTPs and order SMS.
- Account area: orders, addresses, wishlist, profile, logout.

---

## 12. Admin (Medusa Admin + extensions)

Out of the box: products, variants, categories, collections, tags, inventory, orders, customers, promotions/coupons, returns/refunds, team users.

Custom extensions to build:
- Product specs editor widget on the product page.
- COD queue: list of *Pending confirmation* orders with **Confirm** / **Cancel** buttons.
- "Create Shiprocket shipment" action on orders + AWB/tracking display.
- Reviews moderation page.
- Settings for shipping threshold, COD fee/limit, prepaid discount %.
- Download GST invoice.

---

## 13. SEO & performance

- `generateMetadata` on every page (title, description, Open Graph image).
- JSON-LD: `Product` (price, availability, rating) on product pages; `BreadcrumbList`; `Organization` on home.
- Clean URLs from product handles (e.g. `/products/hanuman-locket-brass-gold`).
- `sitemap.xml` including products, categories, deity, intention and collection pages.
- `next/image` with responsive sizes, WebP/AVIF; lazy-load below the fold.
- Targets on mobile: LCP < 2.5 s, CLS < 0.1. Lighthouse ≥ 90 for performance, SEO, accessibility.

---

## 14. Security & privacy

- HTTPS everywhere; secrets only in environment variables (never committed).
- Razorpay & Shiprocket webhooks verified by signature; idempotent handlers.
- Never store card data (Razorpay hosted checkout handles it).
- Rate-limit OTP, PIN-code check, review and contact endpoints.
- Admin protected with strong passwords; separate admin roles for staff.
- Privacy policy + explicit opt-in checkbox for marketing SMS/email (order SMS/WhatsApp messages are transactional); easy opt-out (India DPDP Act).
- Cookie/analytics consent banner.

---

## 15. Environment variables (names only)

Backend: `MEDUSA_BACKEND_URL` (`https://api.divinesanatani.com`), `COOKIE_DOMAIN`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`, `RESEND_API_KEY`, `MESSAGING_CHANNEL` (`console` | `sms` | `whatsapp` | `both`), `OTP_CHANNEL` (`sms` | `whatsapp` | `sms_then_whatsapp`), `MSG91_AUTH_KEY`, `SMS_SENDER_ID`, `DLT_ENTITY_ID`, `SMS_TEMPLATE_IDS`, `WHATSAPP_PROVIDER` (`meta` | `msg91`), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAMES`, `FILE_UPLOAD_DIR` (dev: `apps/backend/static`; prod: `/var/www/divineaura/uploads`), `FILE_BACKEND_URL` (dev: `http://localhost:9000/static`; prod: `https://api.divinesanatani.com/uploads`), `SELLER_GSTIN`, `SELLER_STATE_CODE`, `SENTRY_DSN`.

Storefront: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_SITE_URL` (`https://divinesanatani.com`), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `REVALIDATE_SECRET`, `SENTRY_DSN`.

Provide `.env.example` files for both apps.

---

## 16. Build milestones (do in order; each ends with a working, tested state)

| # | Milestone | Done when |
| --- | --- | --- |
| 1 | Scaffold monorepo: Medusa backend + Next.js starter storefront, running locally on Windows | Admin opens; storefront lists demo products |
| 2 | Brand theme: tokens, fonts, header, mega menu, mobile bottom bar, footer | Looks on-brand at 375 px and desktop |
| 3 | Catalogue: categories, deity/intention tags, collections, `product-specs` module + admin widget, CSV import | Real products visible with specs |
| 4 | Homepage + listing pages (shop, category, deity, intention, collection) with filters/sort | All browse paths work |
| 5 | Product page: gallery, variants, specs, size guide, mantra card, related products | Product page complete on mobile |
| 6 | Cart + checkout with Razorpay (test mode) + webhook | Test prepaid order reaches *Paid* via webhook |
| 7 | COD provider: fee, limit, PIN blocklist, prepaid discount, confirmation flow, auto-cancel job | Test COD order confirmed and auto-cancel works |
| 8 | Shiprocket: PIN check, shipment creation, tracking sync, order timeline | Tracking shows on order page |
| 9 | Messaging layer (§19): console, SMS and WhatsApp providers + email templates for each event, mobile OTP login | Every event in §10 sends via console in dev; switching `MESSAGING_CHANNEL` changes the channel with no code change |
| 10 | Accounts, wishlist, order history, GST invoice PDF, return request | Customer can see and download everything |
| 11 | Reviews (verified buyers, moderation, photos) | Approved reviews show with rating |
| 12 | Content & legal pages, SEO (metadata, JSON-LD, sitemap), analytics + consent | Lighthouse targets met |
| 13 | QA + deploy to the Hostinger VPS (§18): Nginx, SSL, PM2, PostgreSQL, Redis, backups, domain DNS, live keys | Real order placed and delivered end to end |

Phase 2 (after launch): Find-your-bracelet quiz, rashi pages, build-your-own combo, Hindi language, blog, abandoned-cart email, optional WhatsApp channel, loyalty points, PWA install. Phase 3: Expo (React Native) apps using `packages/` shared client.

---

## 17. Out of scope for v1

Marketplace sellers, international shipping, subscriptions, multi-currency, live chat bot, mobile apps.

---

## 18. Production hosting — single Hostinger VPS

**Server:** Hostinger KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe) or larger, Ubuntu LTS, India data centre. KVM 1 (1 vCPU, 4 GB) can work at the very start but builds will be slow and tight on memory.

```
Customer browser
      │  https://divinesanatani.com           https://api.divinesanatani.com
      ▼                                    ▼
  (DNS at registrar → VPS IP)               │
      ▼                                     ▼
  Nginx on VPS (SSL via Let's Encrypt, reverse proxy)
      │                                      │
      ▼                                      ▼
  Next.js storefront (PM2, port 3000)   Medusa server + admin (PM2, port 9000)
                                         │          │           │
                                         ▼          ▼           ▼
                                    PostgreSQL    Redis     Medusa worker (PM2)
                                    (localhost)  (localhost)  (background jobs)
```

- `divinesanatani.com` → Next.js storefront.
- `api.divinesanatani.com` → Medusa API; admin panel at `api.divinesanatani.com/app`.
- Medusa runs in two modes: `server` (API + admin) and `worker` (scheduled jobs, subscribers). Run both under PM2.
- PostgreSQL and Redis listen on localhost only; never exposed to the internet.
- Firewall (UFW): allow only 22 (SSH, key-only login), 80 and 443.
- Deploy flow: push to GitHub → on the VPS `git pull` → install → build → `pm2 reload`. Provide a `deploy.sh` script; optionally a GitHub Action that runs it over SSH.
- After changing products in admin, the backend calls the storefront's revalidate endpoint (`REVALIDATE_SECRET`) so product pages update without a full rebuild.

**Backups & monitoring (required, since there is no managed host):**
- Implemented in `deploy/backup/` (one config file `backup.conf`; setup, restore and PC copy in `deploy/backup/RESTORE.md`). Failures and stale backups email `BACKUP_ALERT_EMAIL` through the messaging layer; Admin → Orders shows the last backup.
- Daily `pg_dump` of the database, compressed, kept on the VPS for 14 days (`/var/backups/divineaura`). Test a restore once before launch.
- Hostinger weekly VPS backups/snapshots enabled; take a snapshot before every major update.
- Product images live in `/var/www/divineaura/uploads` and are included in the daily backup (tar, kept 14 days).
- Off-server copy (so a VPS failure can't lose data): Hostinger's automatic VPS backups enabled, plus a weekly copy of the database dump and uploads folder downloaded to the owner's PC/external drive with a provided `backup-download.ps1` script (scp over SSH). No third-party storage service required.
- Uptime monitor (e.g. UptimeRobot, free) on the homepage and `api.divinesanatani.com/health`, alerting by email/SMS.
- Sentry for errors; PM2 log rotation; automatic Ubuntu security updates.

---

## 19. Messaging layer (SMS and WhatsApp, switchable)

The owner will choose SMS, WhatsApp or both after the site is built, so messaging must not be tied to one channel.

- One backend service: `sendMessage(event, customer, data)` and `sendOtp(phone)`. All order events (§10) and OTP login call only this service, never a provider directly.
- Providers implement one interface (`send(to, templateKey, variables)`), built as Medusa notification module providers:
  - `console` — prints the message to the terminal. Default in development; needs no account.
  - `sms` — MSG91 SMS API with DLT entity ID, sender ID and per-template DLT IDs.
  - `whatsapp` — Meta WhatsApp Cloud API (or MSG91's WhatsApp API), using Meta-approved templates.
- One template catalogue (`templates.ts`): each event has a key, its variables, the SMS text (must match the DLT-registered text exactly) and the WhatsApp template name. Admins edit text only by re-registering templates.
- Config decides routing: `MESSAGING_CHANNEL` = `console` | `sms` | `whatsapp` | `both`; `OTP_CHANNEL` = `sms` | `whatsapp` | `sms_then_whatsapp` (fallback if SMS not delivered in 30 s).
- Every send is logged (event, channel, status, provider message ID, cost if returned) in a `message_log` table, shown in admin.
- Customer consent: transactional messages always; marketing only with opt-in, separately per channel.
- COD confirmation works on both channels via the same signed confirm link (`/confirm/[token]`); WhatsApp may additionally use a quick-reply button.
- Going live on a channel = add its keys + approved template IDs to `.env` and change `MESSAGING_CHANNEL`. No code changes.
