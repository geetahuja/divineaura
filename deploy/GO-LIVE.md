# Anant Sanatan — go-live checklist (divinesanatani.com)

Staging runs the full shop privately. Every item below is **a settings change** —
an `.env` value and/or an admin setting — never a rebuild. Do them in any order,
test each one on staging, then do the final switch (§10).

## 0. How changes are made

| What | Where |
| --- | --- |
| Backend settings | `/var/www/divineaura/shared/backend.env` |
| Storefront settings | `/var/www/divineaura/shared/storefront.env` |
| Apply `.env` changes | `ssh divineaura "pm2 restart all --update-env"` |
| Edit a file | `ssh -t divineaura "nano /var/www/divineaura/shared/backend.env"` |
| Logs (incl. console messages / OTPs on staging) | `ssh divineaura "pm2 logs --lines 100"` |
| Deploy new code | `ssh divineaura "bash /var/www/divineaura/app/deploy/deploy.sh"` |
| Staging ↔ live | `ssh -t divineaura "sudo bash /var/www/divineaura/app/deploy/server/site-mode.sh live"` |

After **every** `.env` change, refresh the encrypted copy of the secrets (it asks for a password):
`ssh -t divineaura "sudo bash /usr/local/lib/divineaura-backup/secrets-backup.sh"`.

Never paste keys into chat or commit them. Values with a `$` in them must be wrapped in single quotes.

---

## 1. GSTIN and GST scheme

1. Admin → **Business details**: legal name, registered address, **State**, **GSTIN**.
   The GSTIN's first two digits must match the State (the form checks this).
2. **GST scheme**:
   - **Regular** (default): tax invoices with CGST+SGST / IGST, delivery all over India.
   - **Composition**: no GST charged or shown, documents are a **Bill of Supply**
     ("Composition taxable person, not eligible to collect tax on supplies"), own number
     series (`BOS/26-27/00001`), and checkout/PIN checks accept **only PIN codes in your State**.
   - Switch only when every open order already has its invoice (the scheme in force when a
     document is issued decides its type). Switching back restores tax invoices and nationwide delivery.
3. Set the HSN code and GST rate on each product ("Product details & specs" panel). Ask your CA to
   confirm the SAC codes used for shipping (996812) and the COD fee (999799).

**Test:** place a test order → Admin → order → download the invoice. Composition: check the
title, no tax columns, the declaration line; try a PIN from another state on the product page
(should say "we currently deliver only within …").

---

## 2. Razorpay (online payments)

1. Razorpay Dashboard → switch to **Test mode** → Account & Settings → **API keys** → generate.
2. Account & Settings → **Webhooks** → Add new webhook:
   - URL: `https://api.divinesanatani.com/hooks/payment/razorpay_razorpay`
   - Secret: any long random string (e.g. `openssl rand -hex 32` on the server)
   - Active event: **order.paid** (the only one used)
3. `backend.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_…
   RAZORPAY_KEY_SECRET=…
   RAZORPAY_WEBHOOK_SECRET=<the webhook secret>
   ```
   then `pm2 restart all --update-env`. (Nothing goes into the storefront: the public key id
   reaches the browser through the payment session.)
4. Admin → **Settings → Regions → India → Edit → Payment providers**: tick **razorpay**
   (and untick **test-payment** before going live).
5. Payments are captured automatically: Dashboard → Account & Settings → Payment capture →
   **Automatic** (if left manual, the backend captures when the webhook arrives).

**Test on staging (test keys)** — the checklist the code could only cover with mocks:
- [ ] Checkout shows "UPI, cards, net banking (Razorpay)"; the popup opens with the right amount
      (prepaid discount applied, no COD fee).
- [ ] Pay with a Razorpay **test** UPI ID / card (Razorpay docs → "Test card / UPI details").
      You land on the order confirmation page.
- [ ] Within ~10 s the order shows **Paid** (Admin → order; webhook in Razorpay → Webhooks → logs shows 200).
- [ ] Close the popup → back on checkout with "payment cancelled"; cart intact.
- [ ] A failed test payment → retry works, no duplicate order.
- [ ] Pay, then close the tab before the redirect → the order still appears (the webhook completes it).
- [ ] Refund from Admin (return / cancellation) → refund visible in Razorpay; credit note issued.
- [ ] Change the webhook secret to a wrong value → payment not marked paid (`pm2 logs` shows
      "invalid signature"); set it back.

**Live:** repeat steps 1–3 in **Live mode** (KYC approved), new webhook with the same URL and a new
secret, `rzp_live_…` keys. Place one real ₹1 order and refund it.

### Adding another gateway (Cashfree, PayU, PhonePe PG, Paytm PG)

Several gateways can be active at once; customers see each one at checkout.
1. Backend: copy `apps/backend/src/modules/razorpay-payment/` to `<name>-payment/` and implement the
   same methods with the gateway's API (create order in `initiatePayment`, check status in
   `authorizePayment`, verify the signed webhook in `getWebhookActionAndData`, capture/refund).
   Keep money in paise and put **our** session id into the gateway's order (notes / metadata) so the
   webhook can only match the session we created. Add a unit test like `staging-gateways.unit.spec.ts`.
2. `apps/backend/medusa-config.ts`: add it to `paymentProviders`, loaded only when its keys are set.
3. Storefront: add `apps/storefront/src/lib/payments/<name>.tsx` (+ button) like `razorpay.tsx`, and
   list it in `ADAPTERS` in `lib/payments/index.tsx`.
4. Deploy; set its keys; register its webhook `https://api.divinesanatani.com/hooks/payment/<identifier>_<id>`;
   tick it in Admin → Regions → India.

---

## 3. Shipping: Shiprocket and/or your own courier

**Shiprocket**
1. Shiprocket → Settings → API → **Configure** → create an API user (a different email from your login).
2. Settings → **Pickup Addresses**: add the warehouse; note its **nickname** exactly.
3. Admin → Settings → **Locations**: same address with the PIN code (used for rate/ETA checks).
4. `backend.env`:
   ```
   SHIPROCKET_EMAIL=<api user email>
   SHIPROCKET_PASSWORD=<api user password>
   SHIPROCKET_PICKUP_LOCATION=<pickup nickname>
   ```
   `SHIPROCKET_WEBHOOK_TOKEN` is already generated. Restart.
5. Shiprocket → Settings → API → **Webhooks**: URL `https://api.divinesanatani.com/hooks/shipping/shiprocket`,
   token = the value of `SHIPROCKET_WEBHOOK_TOKEN` (`grep SHIPROCKET_WEBHOOK_TOKEN …/backend.env`).
   The header name must match `SHIPROCKET_WEBHOOK_HEADER` (default `x-api-key`) — **verify with the
   first real shipment**: `pm2 logs | grep "shipping webhook"` should not show "rejected".
6. Admin → **Shipping & couriers** → Default courier: **Shiprocket** (or Automatic).

**Manual courier** (your own tie-up, works today): Admin → **Shipping & couriers** → courier name,
tracking link template (`https://…{awb}`), delivery days, and paste the PIN codes it serves and
those where it collects cash. On an order: pick "Manual courier", enter the AWB → **Mark shipped**;
later **Mark out for delivery / delivered / RTO**. The customer gets the tracking link and messages.
Default courier can be Manual; each order can override it. If the courier later offers an API,
add it as a new courier in `apps/backend/src/lib/couriers/` (like `shiprocket.ts`).

**Test:** PIN check on a product page; place an order → Create shipment → label/AWB; for Shiprocket
watch the timeline update from the webhook; for manual, move it through the statuses.

---

## 4. SMS (MSG91 + DLT)

1. **DLT** (any operator portal, e.g. Jio TrueConnect / Vi / Airtel):
   - Register the business (Principal Entity) → **Entity ID**.
   - Register a 6-letter **header** (sender ID), e.g. `ANTSAN`. Brand on the DLT entity: **Anant Sanatan** (a brand of Jayshankar Enterprises).
   - Register each **content template** exactly as the SMS text in
     `apps/backend/src/modules/messaging/templates.ts`, with every `{variable}` replaced by `{#var#}`
     (e.g. `Order #{order}` → `Order #{#var#}`; `dltText()` in that file does the conversion). Category: Service-Implicit for
     order messages, OTP for the login code.
   - **Whitelist the URL domain** `divinesanatani.com` (and `api.divinesanatani.com`, used in invoice
     links) — SMS containing un-whitelisted links are blocked.
2. MSG91 → add the DLT Entity ID and header; create one **Flow** per template with its DLT template id.
3. `backend.env`:
   ```
   MSG91_AUTH_KEY=…
   SMS_SENDER_ID=ANTSAN
   DLT_ENTITY_ID=…
   SMS_TEMPLATE_IDS=otp_login=…,order_placed=…,order_shipped=…   (event=MSG91 template id, all events)
   MESSAGING_CHANNEL=sms        # or both, once WhatsApp is ready
   OTP_CHANNEL=sms
   ```
**Test:** log in with your mobile (OTP arrives); place an order → Admin → **Message log** shows
"sent" with a provider message id for each event.

## 5. WhatsApp

1. Meta Business Manager → verify the business and **divinesanatani.com**; WhatsApp Manager → add the
   phone number; create message templates matching `templates.ts` (names and variables); wait for approval.
2. `backend.env`: `WHATSAPP_PROVIDER=meta`, `WHATSAPP_PHONE_NUMBER_ID=…`, `WHATSAPP_ACCESS_TOKEN=…`
   (a **System User** permanent token), optional `WHATSAPP_TEMPLATE_NAMES=event=template_name,…`.
   Then `MESSAGING_CHANNEL=whatsapp` or `both`; `OTP_CHANNEL=sms_then_whatsapp` for OTP fallback.
   (Via MSG91 instead: `WHATSAPP_PROVIDER=msg91`, `MSG91_WHATSAPP_NUMBER=…`.)

**Test:** same as SMS; Message log shows the WhatsApp channel.

## 6. Email (Resend) + SPF / DKIM / DMARC on GoDaddy

1. Resend → Domains → Add `divinesanatani.com` (region closest to India). Resend shows the DNS records.
2. GoDaddy → divinesanatani.com → **DNS** → add exactly what Resend shows — typically:
   - `TXT  resend._domainkey   p=…` (DKIM)
   - `MX   send   feedback-smtp.<region>.amazonses.com  priority 10`
   - `TXT  send   v=spf1 include:amazonses.com ~all` (SPF for the sending subdomain)
3. **DMARC — replace GoDaddy's default.** GoDaddy pre-creates `_dmarc` with its own `rua` address.
   Edit that record (don't add a second one):
   `TXT  _dmarc  v=DMARC1; p=none; rua=mailto:support@divinesanatani.com; adkim=r; aspf=r`
   After 2–4 weeks of clean reports change `p=none` → `p=quarantine`.
4. Resend → Verify. Then `backend.env`: `RESEND_API_KEY=re_…`
   (`EMAIL_FROM` = `Anant Sanatan <noreply@divinesanatani.com>`, `EMAIL_REPLY_TO` = support@ are preset).
5. Mailboxes for `support@` and `orders@` (Google Workspace / Zoho / GoDaddy email): add **their**
   MX records on the root domain, and add their SPF include to a root `v=spf1 … ~all` record (only ONE
   SPF TXT on the root).
6. `BACKUP_ALERT_EMAIL=you@…` in `backend.env` (backup failure alerts).

**Test:** order with an email address → confirmation email arrives, not in spam; Gmail → "Show original"
shows SPF, DKIM and DMARC **PASS**.

## 7. Analytics and Search Console

- `storefront.env`: `GA4_ID=G-…`, `META_PIXEL_ID=…` → restart. They load **only when SITE_MODE=live**
  and only after the visitor accepts cookies.
- **Search Console**: add a Domain property `divinesanatani.com` → verify with the **TXT record** it shows
  (GoDaddy DNS) — no code change. After going live: Sitemaps → submit `https://divinesanatani.com/sitemap.xml`.
- Meta Business: verify the domain (DNS TXT) as well.

**Test (after go-live):** GA4 → Realtime shows your visit after accepting cookies; Meta Events Manager → Test events.

## 8. Monitoring

UptimeRobot (free) → HTTP(s) monitors, 5-minute interval:
- `https://api.divinesanatani.com/health` (expects 200 "OK")
- `https://divinesanatani.com/api/health` (expects 200; open even on staging)
- after go-live also `https://divinesanatani.com/`
Alert contacts: your email + mobile.

## 8a. CI and (later) automatic deploys

Every push and pull request to `main` runs **GitHub Actions CI** (`.github/workflows/ci.yml`):
type-check, backend + storefront tests, production builds. It never deploys — deploying stays
manual: `ssh divineaura "bash /var/www/divineaura/app/deploy/deploy.sh"`. Deploy only when CI is green.

To add automatic deploys later (after go-live has settled):
1. On the PC, make a **separate** key just for GitHub: `ssh-keygen -t ed25519 -f $HOME\.ssh\divineaura_ci_deploy -N '""'`.
2. On the VPS, add its public key to `/home/deploy/.ssh/authorized_keys` prefixed with
   `command="bash /var/www/divineaura/app/deploy/deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding `
   so the key can only run the deploy script.
3. GitHub → repo Settings → **Environments** → `production` (add yourself as a required reviewer, so each
   deploy waits for your click) → secrets `VPS_SSH_KEY` (the private key) and `VPS_KNOWN_HOSTS`
   (output of `ssh-keyscan 189.72.151.83`).
4. Add a `deploy` job to `ci.yml`: `needs: [typecheck, test, build]`, `if: github.ref == 'refs/heads/main'`,
   `environment: production`; it writes the key + known_hosts to `~/.ssh` and runs `ssh deploy@189.72.151.83`.
   deploy.sh already rolls back on a failed health check.

## 9. Before the switch

- [ ] Real products with photos, prices, stock, HSN/GST rates; delete anything marked "Sample".
- [ ] **REQUIRED — remove the demo catalogue** (16 products tagged `demo`, "Representative image"):
      ```powershell
      ssh divineaura "bash /var/www/divineaura/app/deploy/server/remove-demo-products.sh"
      ```
      It also clears the AI placeholder photos on Sacred Places (credit "Representative AI illustration").
- [ ] **REQUIRED — replace every AI placeholder image** with real photos (they are AI mockups, not
      verified photos of real products, temples or licensed Godavari water). Files in
      `apps/storefront/public/placeholders/` (WebP + JPG pairs, keep the same names and sizes):
      - Homepage hero art (used when a hero slide has no uploaded image): `temple-ghats`, `kumbh-ghat-pilgrims`,
        `diya-rudraksha` — or simply upload real images on each slide in Admin → Hero banners.
      - Category cards: `category-gemstone-bracelets`, `category-hand-ties`, `category-lockets`, `category-puja-essentials`.
      - Kumbh band / pages: `kumbh-ghat-pilgrims`, `goda-jal-bottle` (illustration).
      - Demo-only (gone after remove-demo-products.sh): `bracelet-*`, `locket-*`, `hand-tie-*`, `place-*`,
        `goda-jal-gift-box`, `product-placeholder`.
      Then delete the files you no longer use and redeploy.
- [ ] Goda Jal: Admin → Business details → **"Goda Jal – packed by"** (licensed packer name, address,
      licence no.); each Goda Jal product's net quantity and month/year of packing; GST rate for Goda Jal
      confirmed with your CA (Settings → Tax Regions → India, product type "Goda Jal").
- [ ] Journal drafts and the "Our story" page reviewed (they start with "DRAFT – owner to review").
- [ ] Business details complete (GSTIN, grievance officer); policies reviewed (Admin → Pages).
- [ ] Payment, courier, messaging and email tested above on staging.
- [ ] Admin → Settings → Regions → India: **untick test-payment**.
- [ ] Admin → Shipping & couriers: default courier is not "Test courier".
- [ ] Optional: delete test customer accounts (Admin → Customers).
- [ ] Hostinger → take a **snapshot**.
- [ ] **REQUIRED — last step before the switch: delete all test orders and reset the numbering.**
      GST invoice numbers must be consecutive with no gaps, and staging test orders have already used
      numbers (e.g. AS/26-27/00001; before the rebrand DA/…). Run, still in staging mode:
      ```powershell
      ssh -t divineaura "bash /var/www/divineaura/app/deploy/server/reset-test-orders.sh"
      ```
      Type `DELETE TEST ORDERS` when asked. It takes a backup first, then in one all-or-nothing step
      deletes every order, cart, payment, shipment, invoice, credit note, return, review and message
      and resets the counters. It keeps products, stock, customers, pages, settings and admin users.
      Afterwards the first real order is **#1**, the first invoice **AS/26-27/00001** (credit notes
      **CN/26-27/00001**, Bills of Supply **BOS/26-27/00001**). It refuses to run once SITE_MODE is live.
      - Then check stock in Admin → Inventory (shipped test orders reduced it).
      - Place **no more test orders** before §10 — any order now takes a real invoice number.

## 10. Final switch — go live

```powershell
ssh -t divineaura "sudo bash /var/www/divineaura/app/deploy/server/site-mode.sh live"
```
This removes the password, the noindex header, the robots.txt block and the staging banner,
turns analytics on (if IDs are set) and makes the backend refuse the test gateway and test courier.
Then:
- [ ] Open https://divinesanatani.com in a private window — no password, no banner.
- [ ] `https://divinesanatani.com/robots.txt` lists the sitemap; Search Console → submit the sitemap.
- [ ] Place one real order (small amount), pay with Razorpay live, ship it, mark delivered → milestone 13 done.

Back to staging at any time: `… site-mode.sh staging` (a new password is not created; the old one stays).
