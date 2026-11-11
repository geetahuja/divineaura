/**
 * One catalogue for every customer message (ARCHITECTURE.md §10, §19).
 *
 * SMS: `{name}` placeholders. For DLT registration each placeholder becomes
 * `{#var#}` (see dltText) — register the text EXACTLY as generated. "Rs." is used
 * instead of "₹" so messages stay GSM-7 (160 chars, not 70). Links are built from
 * STOREFRONT_URL (= NEXT_PUBLIC_SITE_URL). Template IDs come from .env
 * (SMS_TEMPLATE_IDS / WHATSAPP_TEMPLATE_NAMES) — no code change when they're issued.
 *
 * WhatsApp: utility templates; `{{1}}…` follow `params` order.
 */

export type Category = "otp" | "transactional" | "marketing"

export type EmailSpec = {
  subject: string
  heading: string
  lines: string[] // paragraphs, may contain {placeholders}
  cta?: { label: string; url: string } // url placeholder, e.g. "{link}"
}

export type TemplateSpec = {
  category: Category
  vars: string[]
  sms?: string
  whatsapp?: { name: string; params: string[] }
  email?: EmailSpec
}

export const TEMPLATES = {
  otp_login: {
    category: "otp",
    vars: ["otp", "domain"],
    // Last line = Web OTP format so Android can auto-fill the code.
    sms: "{otp} is your DivineAura login code. It is valid for 5 minutes. Do not share it with anyone.\n\n@{domain} #{otp}",
    whatsapp: { name: "login_otp", params: ["otp"] },
    email: {
      subject: "Your DivineAura login code",
      heading: "Your login code",
      lines: ["Use this code to sign in to DivineAura:", "<strong style=\"font-size:28px;letter-spacing:6px\">{otp}</strong>", "It is valid for 5 minutes. If you didn't ask for it, you can ignore this email."],
    },
  },
  order_placed: {
    category: "transactional",
    vars: ["order", "amount", "link"],
    sms: "DivineAura: Thank you! Your order #{order} of Rs.{amount} is confirmed. We will message you when it ships. Details: {link}",
    whatsapp: { name: "order_confirmed", params: ["order", "amount", "link"] },
    email: {
      subject: "Order #{order} confirmed",
      heading: "Thank you for your order",
      lines: ["Your order <strong>#{order}</strong> of <strong>Rs.{amount}</strong> is confirmed.", "We'll let you know as soon as it ships."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  cod_confirm_request: {
    category: "transactional",
    vars: ["order", "amount", "link", "hours"],
    sms: "DivineAura: Please confirm your Cash on Delivery order #{order} of Rs.{amount}. Tap {link} within {hours} hours, or it will be cancelled.",
    whatsapp: { name: "cod_confirm_request", params: ["order", "amount", "link", "hours"] },
  },
  cod_confirmed: {
    category: "transactional",
    vars: ["order", "amount", "link"],
    sms: "DivineAura: Thank you! Your Cash on Delivery order #{order} is confirmed. Please keep Rs.{amount} ready at delivery.",
    whatsapp: { name: "cod_confirmed", params: ["order", "amount"] },
    email: {
      subject: "Your Cash on Delivery order #{order} is confirmed",
      heading: "Order confirmed",
      lines: ["Thank you for confirming order <strong>#{order}</strong>.", "Please keep <strong>Rs.{amount}</strong> ready when it arrives. We'll message you when it ships."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  order_shipped: {
    category: "transactional",
    vars: ["order", "courier", "link", "invoice"],
    sms: "DivineAura: Your order #{order} has shipped via {courier}. Track it here: {link}",
    whatsapp: { name: "order_shipped", params: ["order", "courier", "link"] },
    email: {
      subject: "Order #{order} has shipped",
      heading: "Your order is on its way",
      lines: ["Order <strong>#{order}</strong> has shipped with <strong>{courier}</strong>.", "Your GST invoice: <a href=\"{invoice}\" style=\"color:#762019\">download PDF</a>"],
      cta: { label: "Track your order", url: "{link}" },
    },
  },
  out_for_delivery: {
    category: "transactional",
    vars: ["order", "link"],
    sms: "DivineAura: Your order #{order} is out for delivery today. Track it here: {link}",
    whatsapp: { name: "out_for_delivery", params: ["order", "link"] },
  },
  order_delivered: {
    category: "transactional",
    vars: ["order", "link"],
    sms: "DivineAura: Your order #{order} has been delivered. Thank you for shopping with us! Need help? {link}",
    whatsapp: { name: "order_delivered", params: ["order", "link"] },
    email: {
      subject: "Order #{order} delivered",
      heading: "Delivered with blessings",
      lines: ["Your order <strong>#{order}</strong> has been delivered. We hope it brings you peace and joy.", "If anything isn't right, just reply to this email."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  order_rto: {
    category: "transactional",
    vars: ["order", "link"],
    sms: "DivineAura: We could not deliver your order #{order} and it is being returned to us. We will contact you shortly. Help: {link}",
    whatsapp: { name: "order_returned", params: ["order", "link"] },
  },
  order_cancelled: {
    category: "transactional",
    vars: ["order", "reason", "link"],
    sms: "DivineAura: Order #{order} is cancelled ({reason}). Any amount paid will be refunded in 5-7 working days. {link}",
    whatsapp: { name: "order_cancelled", params: ["order", "reason", "link"] },
    email: {
      subject: "Order #{order} cancelled",
      heading: "Your order was cancelled",
      lines: ["Order <strong>#{order}</strong> has been cancelled ({reason}).", "If you paid online, the amount will be refunded to your original payment method within 5–7 working days."],
      cta: { label: "Shop again", url: "{link}" },
    },
  },
  refund_processed: {
    category: "transactional",
    vars: ["order", "amount", "link"],
    sms: "DivineAura: A refund of Rs.{amount} for order #{order} has been processed. It may take 5-7 working days to reflect. Help: {link}",
    whatsapp: { name: "refund_processed", params: ["order", "amount", "link"] },
    email: {
      subject: "Refund for order #{order}",
      heading: "Your refund is on its way",
      lines: ["We've refunded <strong>Rs.{amount}</strong> for order <strong>#{order}</strong>.", "It may take 5–7 working days to appear in your account."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  return_requested: {
    category: "transactional",
    vars: ["order", "link"],
    sms: "DivineAura: We have received your return request for order #{order}. We will review it within 2 working days. Details: {link}",
    whatsapp: { name: "return_requested", params: ["order", "link"] },
    email: {
      subject: "Return request for order #{order} received",
      heading: "We've received your return request",
      lines: ["Thank you for letting us know. We'll review your return request for order <strong>#{order}</strong> within 2 working days and keep you posted."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  return_approved: {
    category: "transactional",
    vars: ["order", "awb", "link"],
    sms: "DivineAura: Return for order #{order} approved. Courier pickup in 2-4 days, AWB {awb}. Keep the item packed. {link}",
    whatsapp: { name: "return_approved", params: ["order", "awb", "link"] },
    email: {
      subject: "Return approved for order #{order}",
      heading: "Your return is approved",
      lines: ["A courier will pick up the item(s) from your address in 2–4 working days (pickup AWB <strong>{awb}</strong>).", "Please keep the item(s) packed with all tags and accessories."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  return_rejected: {
    category: "transactional",
    vars: ["order", "reason", "link"],
    sms: "DivineAura: Sorry, we could not accept the return for order #{order} ({reason}). Reply or contact us for help: {link}",
    whatsapp: { name: "return_rejected", params: ["order", "reason", "link"] },
    email: {
      subject: "About your return for order #{order}",
      heading: "We couldn't accept this return",
      lines: ["We're sorry — the return request for order <strong>#{order}</strong> could not be accepted: {reason}.", "If you have questions, just reply to this email."],
      cta: { label: "Contact us", url: "{link}" },
    },
  },
  return_received: {
    category: "transactional",
    vars: ["order", "link"],
    sms: "DivineAura: We have received your returned item(s) for order #{order}. Your refund is being processed. {link}",
    whatsapp: { name: "return_received", params: ["order", "link"] },
    email: {
      subject: "Returned item(s) received – order #{order}",
      heading: "Your return has reached us",
      lines: ["We've received the returned item(s) for order <strong>#{order}</strong>. Your refund is being processed and we'll confirm once it's done."],
      cta: { label: "View your order", url: "{link}" },
    },
  },
  admin_password_reset: {
    category: "transactional",
    vars: ["link"],
    email: {
      subject: "Reset your DivineAura admin password",
      heading: "Reset your password",
      lines: ["Someone asked to reset the password for your DivineAura admin account.", "The link is valid for a short time. If it wasn't you, ignore this email — your password stays the same."],
      cta: { label: "Reset password", url: "{link}" },
    },
  },
} satisfies Record<string, TemplateSpec>

export type MessageEvent = keyof typeof TEMPLATES

/** Fills `{name}` placeholders; a missing variable is a bug, so it throws. */
export function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (vars[k] === undefined || vars[k] === null) throw new Error(`Template variable "${k}" is missing`)
    return String(vars[k])
  })
}

/** Text to register on the DLT portal: every placeholder becomes {#var#}. */
export const dltText = (sms: string) => sms.replace(/\{(\w+)\}/g, "{#var#}")
