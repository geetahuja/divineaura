/**
 * Tiny PDF writer for invoices and credit notes — text, lines and filled
 * boxes on A4 pages with the standard PDF fonts (no font files, no dependency).
 * Coordinates are in points from the TOP-left corner. Text is WinAnsi (Latin):
 * "₹" isn't in the standard fonts, so amounts are printed as "Rs.".
 * ponytail: no images/embedded fonts; use a PDF library if the design needs them.
 */
export const A4 = { w: 595.28, h: 841.89 }
type Font = "regular" | "bold" | "serif"
type RGB = [number, number, number]

const FONT_NAMES: Record<Font, string> = { regular: "Helvetica", bold: "Helvetica-Bold", serif: "Times-Bold" }
const FONT_KEYS: Record<Font, string> = { regular: "F1", bold: "F2", serif: "F3" }

// Helvetica advance widths (1/1000 em) for ASCII 32–126, from the standard AFM.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584]

const WINANSI: Record<string, number> = { "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "…": 0x85, "×": 0xd7, "₹": -1 }

function encode(s: string): string {
  let out = ""
  for (const ch of s.replace(/₹\s?/g, "Rs.")) {
    const code = ch.charCodeAt(0)
    const mapped = WINANSI[ch] ?? (code < 256 ? code : 63) // "?" for anything else
    const c = String.fromCharCode(mapped)
    out += c === "(" || c === ")" || c === "\\" ? `\\${c}` : mapped > 126 ? `\\${mapped.toString(8).padStart(3, "0")}` : c
  }
  return out
}

export function textWidth(s: string, size: number, font: Font = "regular") {
  let w = 0
  for (const ch of s.replace(/₹\s?/g, "Rs.")) {
    const c = ch.charCodeAt(0)
    const base = c >= 32 && c <= 126 ? HELV[c - 32] : 556
    w += font === "regular" || /[0-9.,]/.test(ch) ? base : base * 1.06 // bold/serif approximation
  }
  return (w * size) / 1000
}

/** Splits text into lines that fit `width`. */
export function wrap(s: string, width: number, size: number, font: Font = "regular") {
  const lines: string[] = []
  let cur = ""
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word
    if (textWidth(next, size, font) <= width || !cur) cur = next
    else {
      lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}

const f = (n: number) => (Math.round(n * 100) / 100).toString()
const rgb = (c: RGB, op: "rg" | "RG") => `${c.map((v) => f(v / 255)).join(" ")} ${op}`

export class Pdf {
  private pages: string[][] = []
  private cur: string[] = []

  constructor() {
    this.addPage()
  }

  addPage() {
    this.cur = []
    this.pages.push(this.cur)
  }

  text(x: number, y: number, s: string, o: { size?: number; font?: Font; color?: RGB; align?: "left" | "right" | "center" } = {}) {
    const size = o.size ?? 9
    const font = o.font ?? "regular"
    const w = o.align && o.align !== "left" ? textWidth(s, size, font) : 0
    const left = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x
    this.cur.push(`BT ${rgb(o.color ?? [42, 26, 20], "rg")} /${FONT_KEYS[font]} ${size} Tf ${f(left)} ${f(A4.h - y)} Td (${encode(s)}) Tj ET`)
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = [232, 205, 169], width = 0.75) {
    this.cur.push(`${rgb(color, "RG")} ${width} w ${f(x1)} ${f(A4.h - y1)} m ${f(x2)} ${f(A4.h - y2)} l S`)
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB) {
    this.cur.push(`${rgb(fill, "rg")} ${f(x)} ${f(A4.h - y - h)} ${f(w)} ${f(h)} re f`)
  }

  toBuffer(): Buffer {
    const objs: string[] = []
    const add = (s: string) => objs.push(s) // object number = index + 1
    add("<< /Type /Catalog /Pages 2 0 R >>")
    add("") // pages tree, filled below
    const fontStart = objs.length + 1
    for (const k of ["regular", "bold", "serif"] as Font[]) add(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_NAMES[k]} /Encoding /WinAnsiEncoding >>`)
    const fonts = `<< /F1 ${fontStart} 0 R /F2 ${fontStart + 1} 0 R /F3 ${fontStart + 2} 0 R >>`
    const kids: number[] = []
    for (const ops of this.pages) {
      const stream = ops.join("\n")
      add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`)
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font ${fonts} >> /Contents ${objs.length} 0 R >>`)
      kids.push(objs.length)
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`

    let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    const offsets: number[] = []
    objs.forEach((o, i) => {
      offsets.push(Buffer.byteLength(out, "latin1"))
      out += `${i + 1} 0 obj\n${o}\nendobj\n`
    })
    const xref = Buffer.byteLength(out, "latin1")
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
    return Buffer.from(out, "latin1")
  }
}
