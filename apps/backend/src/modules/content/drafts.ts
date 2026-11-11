/**
 * First drafts of the content pages (milestone 12), written from how the site
 * actually works. Numbers are {{placeholders}} filled from live settings, so
 * they never go out of date. Every page starts with a DRAFT note — remove it in
 * Admin → Pages once the owner (and ideally a lawyer) has reviewed the text.
 * Assumptions are listed in ASSUMPTIONS below and in the milestone notes.
 */
const DRAFT = "> DRAFT – owner to review. Please check every statement before launch, then delete this line."

export const ASSUMPTIONS = [
  "Business is a proprietorship/firm 'Jayshankar Enterprises' selling its own stock (not a marketplace).",
  "Delivery only within India; no international shipping.",
  "Online refunds take 5–7 working days after we process them (bank/UPI timelines vary).",
  "COD refunds (after returns) are paid to the customer's UPI ID or bank account within 7 working days of the return reaching us.",
  "Return shipping is free for approved returns (we book the reverse pickup); shipping charges and the COD fee are not refunded on returns.",
  "Damaged/wrong items must be reported within 48 hours of delivery with photos.",
  "Exchanges are handled as a return + new order (no direct exchange flow yet).",
  "Data retention: order and invoice records kept 8 years (GST/Income-tax); marketing data until consent is withdrawn.",
  "Analytics: Google Analytics 4 and Meta Pixel, only after cookie consent.",
  "Governing law: courts at the city of the registered office (to be filled).",
  "Customers must be 18+ or use the site with a parent/guardian.",
]

export type Draft = { slug: string; title: string; seo_title: string; seo_description: string; body: string; faq?: { q: string; a: string }[] }

export const DRAFTS: Draft[] = [
  {
    slug: "about",
    title: "Our story",
    seo_title: "About DivineAura – devotional jewellery made with care",
    seo_description: "Why DivineAura began, how our lockets, malas, bracelets and sacred threads are made, and what we promise our customers.",
    body: `${DRAFT}

## Why DivineAura
DivineAura began with a simple wish: to make devotional pieces we would be proud to wear ourselves — lockets, malas, bracelets and sacred threads that honour the traditions they come from.

## What we make
- **Lockets** with deity images in brass, silver-tone and enamel finishes.
- **Spiritual and gemstone bracelets** — every stone is described truthfully as natural, reconstituted or dyed.
- **Malas and hand ties (kalava, dhaga)** made in the traditional way.
- **Gift sets** for festivals, pujas and new beginnings.

## Our promise
- **Honest descriptions.** We describe the beliefs and traditions around each piece. We never promise guaranteed health, wealth or life results.
- **Truthful materials.** Gemstones are labelled natural, reconstituted or dyed, with certificates where available.
- **Careful packing** and dispatch within {{dispatch_days}} working days.

## Who we are
{{brand}} is a brand of **{{legal_name}}**, {{address}}. GSTIN: {{gstin}}.

Questions? [Contact us](/contact) — we reply within one working day.`,
  },
  {
    slug: "contact",
    title: "Contact us",
    seo_title: "Contact DivineAura",
    seo_description: "Email, phone and the seller's registered details for DivineAura. Send us a message about an order, a product or anything else.",
    body: `${DRAFT}

We usually reply within one working day (Monday–Saturday, 10 am – 6 pm IST).

- **Email:** [{{support_email}}](mailto:{{support_email}})
- **Phone / WhatsApp:** {{support_phone}}
- **Track an order:** [Track your order](/track-order) with your order number and mobile number.

## Seller details
**{{legal_name}}** (brand: {{brand}})
{{address}}
GSTIN: {{gstin}}

## Complaints
If something has gone wrong, our Grievance Officer **{{grievance_name}}** will help: [{{grievance_email}}](mailto:{{grievance_email}}), {{grievance_phone}}. See our [Grievance Redressal policy](/policies/grievance).`,
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    seo_title: "FAQ – orders, delivery, COD and returns | DivineAura",
    seo_description: "Answers about delivery times, Cash on Delivery, paying online, returns, refunds, gemstone authenticity and caring for your DivineAura pieces.",
    body: `${DRAFT}

Can't find your answer? [Contact us](/contact).`,
    faq: [
      { q: "How long does delivery take?", a: "We dispatch within {{dispatch_days}} working days. Delivery usually takes {{delivery_days}} working days after dispatch, depending on your PIN code. You can check the estimate on any product page by entering your PIN code." },
      { q: "Is delivery free?", a: "Delivery is free on orders of {{free_shipping_threshold}} or more. Below that, a shipping charge of {{shipping_fee}} applies. The exact amount is always shown before you pay." },
      { q: "Do you offer Cash on Delivery?", a: "Yes, on orders up to {{cod_max}} for serviceable PIN codes. A COD fee of {{cod_fee}} applies. After placing a COD order you'll get an SMS/WhatsApp link to confirm it — unconfirmed COD orders are cancelled automatically after {{cod_confirm_hours}} hours." },
      { q: "Is there a discount for paying online?", a: "Yes — you save {{prepaid_discount}} on eligible items when you pay online (UPI, cards, net banking). The discount is applied automatically at checkout." },
      { q: "Can I cancel my order?", a: "Yes, until your order is packed. Go to Account → Orders → your order → Cancel order. Online payments are refunded to the original payment method in 5–7 working days." },
      { q: "What is your return policy?", a: "You can request a return within {{return_window_days}} days of delivery from Account → Orders. Some items (for example opened sacred threads and malas) are not returnable — this is shown on the product page. See our [Returns & Refunds policy](/policies/returns-refunds)." },
      { q: "Are your gemstones real?", a: "Each gemstone product says whether the stone is natural, reconstituted or dyed. We never describe a reconstituted or dyed stone as natural. Certificates are provided where mentioned on the product page." },
      { q: "Will this bracelet or locket bring me luck, health or money?", a: "We describe the traditions and beliefs associated with each piece, but we do not promise any guaranteed results. Please wear them as an expression of faith and devotion." },
      { q: "How do I log in?", a: "Use your mobile number — we send a one-time 6-digit code by SMS (or email if you prefer). There is no password to remember. Your earlier orders with that number appear in your account automatically." },
      { q: "How do I get a GST invoice?", a: "Your GST invoice is available in Account → Orders once the order is paid or confirmed, and is linked in the shipping email." },
      { q: "How should I care for my piece?", a: "Keep jewellery away from water, perfume and chemicals, and store it in the pouch provided. Care instructions specific to each product are on its product page." },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping policy",
    seo_title: "Shipping policy – delivery charges and times | DivineAura",
    seo_description: "Delivery charges, free-shipping threshold, dispatch and delivery times, Cash on Delivery and tracking for DivineAura orders across India.",
    body: `${DRAFT}

## Where we deliver
We deliver to serviceable PIN codes across India. Enter your PIN code on a product page or at checkout to check delivery and the estimated date.

## Charges
- **Free delivery** on orders of **{{free_shipping_threshold}}** or more (item value after discounts, excluding the COD fee).
- Below that, a shipping charge of **{{shipping_fee}}** applies.
- All prices include GST. The full breakdown is shown before you pay.

## Dispatch and delivery times
- We dispatch within **{{dispatch_days}} working days** of your order being confirmed.
- Delivery usually takes **{{delivery_days}} working days** after dispatch. Remote areas may take longer.
- Cash on Delivery orders are dispatched only after you confirm the order using the link we send.

## Cash on Delivery (COD)
- Available on orders up to **{{cod_max}}** for serviceable PIN codes; a COD fee of **{{cod_fee}}** applies.
- You must confirm a COD order within **{{cod_confirm_hours}} hours** using the SMS/WhatsApp link, or it is cancelled automatically.

## Tracking
You'll receive the tracking link by SMS/WhatsApp and email when your order ships. You can also [track your order](/track-order) with your order number and mobile number.

## Undelivered parcels
If a parcel can't be delivered after the courier's attempts, it is returned to us and we'll contact you. For prepaid orders we refund the amount paid (shipping charges may be deducted — *owner to decide*).`,
  },
  {
    slug: "returns-refunds",
    title: "Returns & refunds",
    seo_title: "Returns & refunds policy | DivineAura",
    seo_description: "How to return a DivineAura order within the return window, which items can't be returned, and how and when refunds are paid.",
    body: `${DRAFT}

## Return window
You can request a return within **{{return_window_days}} days of delivery** from **Account → Orders → your order → Request a return**. Choose the item(s), the reason, and add photos if the item is damaged or not as described.

## Items that can't be returned
For hygiene and religious reasons, some items can't be returned once opened — for example **sacred threads (kalava, dhaga) and malas**. These are marked **"Not returnable"** on the product page and in the return form. Damaged or wrong items are always accepted (see below).

## Damaged or wrong items
Please tell us within **48 hours of delivery**, with photos of the item and packaging. We'll arrange a free return and a full refund of the item.

## How returns work
1. You request the return; we review it within 2 working days.
2. If approved, we book a free courier pickup from your address.
3. When the item reaches us and passes inspection (unused, with tags and packaging), we refund you.

## Refunds
- **What is refunded:** the price you paid for the returned item(s), after any discount. Shipping charges and the Cash on Delivery fee are not refunded on returns.
- **Paid online:** refunded to the original payment method. It usually appears within **5–7 working days** after we process it.
- **Cash on Delivery:** refunded to the UPI ID or bank account you give in the return form, within **7 working days** after the item reaches us. Your bank details are stored encrypted and deleted after the refund.
- Every refund comes with a **credit note** linked to your GST invoice, available in your account.

## Cancellations
See our [Cancellation policy](/policies/cancellation).`,
  },
  {
    slug: "cancellation",
    title: "Cancellation policy",
    seo_title: "Cancellation policy | DivineAura",
    seo_description: "When and how you can cancel a DivineAura order, what happens to your payment, and when we may cancel an order.",
    body: `${DRAFT}

## Cancelling your order
You can cancel an order **until it is packed** — go to **Account → Orders → your order → Cancel order**. Once packed, it can't be cancelled, but you can request a return after delivery (see [Returns & refunds](/policies/returns-refunds)).

- **Paid online:** the full amount (including shipping) is refunded to your original payment method, usually within **5–7 working days**. A credit note is issued against your invoice.
- **Cash on Delivery:** the order is simply cancelled — nothing is charged.

## When we may cancel
- **Unconfirmed COD orders** are cancelled automatically if not confirmed within **{{cod_confirm_hours}} hours**.
- If an item becomes unavailable, a PIN code turns out not to be serviceable, or there is a pricing error, we may cancel the order and refund any amount paid in full. We'll always tell you by SMS/WhatsApp and email.`,
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    seo_title: "Privacy policy | DivineAura",
    seo_description: "What personal data DivineAura collects, why, how long we keep it, who we share it with, cookies and analytics, and your rights under India's DPDP Act.",
    body: `${DRAFT}

{{legal_name}} ("{{brand}}", "we") respects your privacy. This policy explains what we collect, why, and your rights under the Digital Personal Data Protection Act, 2023.

## What we collect and why
- **Mobile number** — to log you in with a one-time code, send order updates and arrange delivery.
- **Name, delivery address, email (optional)** — to deliver your order, issue GST invoices and send order emails.
- **Order details** — products, amounts, invoices, returns and refunds, to fulfil orders and meet GST and accounting law.
- **UPI ID or bank details** (only for Cash on Delivery refunds) — stored encrypted and **deleted once the refund is paid**.
- **Reviews and photos** you choose to share. Photos are stripped of location data. Only your first name, surname initial and city are shown — or "Verified buyer" if you prefer.
- **Device and usage data** — only if you accept analytics cookies (see below).

We **never store card details or UPI PINs** — payments are handled by our payment provider.

## Messages and consent
- **Order messages** (confirmation, COD confirmation, shipping, delivery, refunds) and **login codes** are sent by SMS, WhatsApp and/or email because they're needed to fulfil your order.
- **Offers and new collections** are sent only if you opt in, separately for SMS, WhatsApp and email. You can opt out anytime in **Account → Profile**, or use the unsubscribe link in any marketing email.

## Who we share data with
Only what's needed: our courier partner (name, address, phone), payment provider, SMS/WhatsApp/email providers, and — if you accept — Google Analytics and Meta. We do not sell personal data.

## Cookies and analytics
Essential cookies keep your cart and login working. **Analytics (Google Analytics) and marketing (Meta Pixel) load only after you accept them** in the cookie banner. You can change your choice anytime using "Cookie settings" in the footer. We never send your phone, email or address to analytics.

## How long we keep data
Order and invoice records: 8 years (tax law). Account data: while your account is active. Marketing preferences: until you withdraw consent. Bank details for COD refunds: deleted once the refund is paid.

## Your rights
You can ask to **access, correct or delete** your personal data, or withdraw consent. Use the request form below or write to our Grievance Officer **{{grievance_name}}** at [{{grievance_email}}](mailto:{{grievance_email}}). Some records (such as invoices) must be kept by law even after a deletion request; we'll tell you what we keep and why.

## Contact
{{legal_name}}, {{address}} · [{{support_email}}](mailto:{{support_email}})`,
  },
  {
    slug: "terms",
    title: "Terms of use",
    seo_title: "Terms of use | DivineAura",
    seo_description: "The terms for using the DivineAura website and buying from us: orders, prices, payments, product descriptions, liability and governing law.",
    body: `${DRAFT}

These terms apply when you use this website or buy from **{{legal_name}}** (brand **{{brand}}**), {{address}}, GSTIN {{gstin}}. By placing an order you agree to them.

## Orders and contract
An order is accepted when we confirm it (online payment received, or Cash on Delivery confirmed by you). We may decline or cancel an order as described in our [Cancellation policy](/policies/cancellation).

## Prices and payment
- All prices are in Indian Rupees and **include GST**. Shipping charges, the COD fee and any discounts are shown before you pay.
- Online payments are processed by our payment provider; Cash on Delivery is available as described in our [Shipping policy](/policies/shipping).

## Product descriptions
We describe products accurately, including whether gemstones are natural, reconstituted or dyed. Handmade items and natural stones vary slightly in colour, size and pattern; photos are representative.

**Spiritual beliefs:** our descriptions explain the traditions and beliefs associated with each item. **We do not promise any health, financial, or life results**, and nothing on this site is medical, financial or astrological advice.

## Your account
You log in with a one-time code sent to your mobile number or email. Keep access to your phone secure; you're responsible for orders placed from your account. You must be 18 or older, or use the site with a parent or guardian.

## Reviews
Only customers who received a product can review it. Reviews must be honest and lawful; we moderate them and may decline reviews that break these rules. We never edit a review's words or rating.

## Liability
To the extent the law allows, our liability for any order is limited to the amount you paid for it. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.

## Governing law
These terms are governed by the laws of India. Courts at **[city – owner to fill]** have jurisdiction.

## Contact and complaints
[Contact us](/contact) or see [Grievance Redressal](/policies/grievance).`,
  },
  {
    slug: "grievance",
    title: "Grievance redressal",
    seo_title: "Grievance redressal | DivineAura",
    seo_description: "How to raise a complaint with DivineAura's Grievance Officer, and how quickly we acknowledge and resolve it.",
    body: `${DRAFT}

In line with the Consumer Protection (E-Commerce) Rules, 2020, we have appointed a Grievance Officer.

## Grievance Officer
- **Name:** {{grievance_name}}
- **Email:** [{{grievance_email}}](mailto:{{grievance_email}})
- **Phone:** {{grievance_phone}}
- **Address:** {{legal_name}}, {{address}}

## How we handle complaints
1. Write to the Grievance Officer with your order number, your mobile number and what went wrong (photos help).
2. We **acknowledge your complaint within {{grievance_ack_hours}} hours**.
3. We **resolve it within {{grievance_resolve_days}} days** of receiving it, and tell you the outcome.

For simple questions about an order, [Contact us](/contact) is usually fastest.

## Seller details
{{legal_name}} (brand {{brand}}), {{address}} · GSTIN {{gstin}} · [{{support_email}}](mailto:{{support_email}}) · {{support_phone}}`,
  },
]

/** Where each page lives on the storefront. */
export const PAGE_PATHS: Record<string, string> = {
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  shipping: "/policies/shipping",
  "returns-refunds": "/policies/returns-refunds",
  cancellation: "/policies/cancellation",
  privacy: "/policies/privacy",
  terms: "/policies/terms",
  grievance: "/policies/grievance",
}
