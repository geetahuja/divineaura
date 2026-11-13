import type { EmailSpec } from "./templates"
import { render } from "./templates"

// Brand email (ARCHITECTURE.md §8): ivory page, maroon header, gold accent rule,
// one 560px column that also reads on 375px phones; inline styles only.
const C = { maroon: "#762019", gold: "#C58A36", ivory: "#FFF5E8", champagne: "#E8CDA9", ink: "#2A1A14", soft: "#5C4A40" }

// Policy links in every email (Consumer Protection (E-Commerce) Rules 2020).
const POLICIES = [
  ["Returns & refunds", "/policies/returns-refunds"],
  ["Shipping", "/policies/shipping"],
  ["Cancellation", "/policies/cancellation"],
  ["Privacy", "/policies/privacy"],
  ["Terms", "/policies/terms"],
  ["Grievance", "/policies/grievance"],
] as const

const stripTags =(html: string) => html.replace(/<[^>]+>/g, "")

// Values can come from customers (contact form, names, review text): always escape
// them for HTML. The template's own markup (<strong>, links) stays as written.
const escapeHtml = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

export function renderEmail(spec: EmailSpec, vars: Record<string, string>, siteUrl: string) {
  const safe = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v ?? "")]))
  const subject = render(spec.subject, vars).replace(/[\r\n]+/g, " ") // plain text; no header injection
  const heading = render(spec.heading, safe)
  const paragraphs = spec.lines.map((l) => render(l, safe))
  const textParagraphs = spec.lines.map((l) => render(l, vars))
  const cta = spec.cta ? { label: spec.cta.label, url: render(spec.cta.url, safe) } : null

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${C.ivory};font-family:Arial,Helvetica,sans-serif;color:${C.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ivory}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.champagne};border-radius:12px;overflow:hidden">
<tr><td style="background:${C.maroon};padding:20px 24px;text-align:center"><a href="${siteUrl}" style="color:#ffffff;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:26px">${safe.brand}</a></td></tr>
<tr><td style="height:3px;background:${C.gold};line-height:3px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:${C.maroon}">${heading}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${C.soft}">${p}</p>`).join("\n")}
${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:${C.maroon};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 28px;border-radius:999px">${cta.label}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${C.champagne};font-size:12px;line-height:1.5;color:${C.soft};text-align:center">
Prices inclusive of all taxes · Questions? Just reply to this email.<br>${POLICIES.map(([label, path]) => `<a href="${siteUrl}${path}" style="color:${C.maroon}">${label}</a>`).join(" · ")}<br><a href="${siteUrl}" style="color:${C.maroon}">${siteUrl.replace(/^https?:\/\//, "")}</a>
</td></tr></table></td></tr></table></body></html>`

  const text = [render(spec.heading, vars), ...textParagraphs.map(stripTags), cta ? `${cta.label}: ${render(spec.cta!.url, vars)}` : ""].filter(Boolean).join("\n\n")
  return { subject, html, text }
}
