/**
 * Small, safe Markdown → HTML for admin-edited content pages. ALL input is
 * HTML-escaped first, so nothing typed in the admin can inject markup or
 * scripts. Supported: ## / ### headings, paragraphs, - and 1. lists,
 * **bold**, *italic*, [links](https://… | /path | mailto: | tel:), > notes, ---.
 * (# is reserved: the page title is the only H1.)
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const safeHref = (h: string) => (/^(https?:\/\/|\/(?!\/)|mailto:|tel:|#)/i.test(h) ? h : null)

function inline(s: string) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, href: string) => {
      const h = safeHref(href.replace(/&amp;/g, "&"))
      if (!h) return text
      const external = /^https?:\/\//i.test(h)
      return `<a href="${esc(h)}"${external ? ' rel="noopener" target="_blank"' : ""}>${text}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
}

export function markdownToHtml(md: string): string {
  const out: string[] = []
  let para: string[] = []
  let list: { tag: "ul" | "ol"; items: string[] } | null = null
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`)
    para = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`)
    list = null
  }
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    let m: RegExpMatchArray | null
    if (!line.trim()) {
      flushPara()
      flushList()
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara()
      flushList()
      const level = Math.max(2, m[1].length) // never a second H1
      out.push(`<h${level}>${inline(m[2])}</h${level}>`)
    } else if (/^-{3,}$/.test(line.trim())) {
      flushPara()
      flushList()
      out.push("<hr>")
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara()
      const tag = /^\s*\d/.test(line) ? "ol" : "ul"
      if (!list || list.tag !== tag) {
        flushList()
        list = { tag, items: [] }
      }
      list.items.push(m[1])
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara()
      flushList()
      out.push(`<aside class="note">${inline(m[1])}</aside>`)
    } else {
      flushList()
      para.push(line.trim())
    }
  }
  flushPara()
  flushList()
  return out.join("\n")
}

/** Fills {{placeholders}} from live settings; unknown names are left visible so they get noticed. */
export const fillPlaceholders = (text: string, vars: Record<string, string>) =>
  text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => (k in vars ? vars[k] : m))
