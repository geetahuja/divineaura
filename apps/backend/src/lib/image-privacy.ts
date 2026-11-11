/**
 * Removes metadata that can reveal a customer's location (EXIF GPS) or device
 * from uploaded review photos — done on the server for every upload, whatever
 * the browser did. Pure byte surgery, no image library:
 *  - JPEG: drops APP1 (EXIF / XMP), APP13 (IPTC) and COM segments
 *  - PNG:  drops eXIf, tEXt, iTXt, zTXt and tIME chunks
 *  - WebP: drops EXIF and XMP chunks and clears the VP8X flags for them
 * Pixel data is untouched. Returns null for anything that isn't one of these.
 */
export type ImageType = "image/jpeg" | "image/png" | "image/webp"

export function sniffImage(b: Buffer): ImageType | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp"
  return null
}

function stripJpeg(b: Buffer): Buffer {
  const out: Buffer[] = [b.subarray(0, 2)] // SOI
  let i = 2
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break
    const marker = b[i + 1]
    if (marker === 0xda) {
      out.push(b.subarray(i)) // start of scan: the rest is image data
      return Buffer.concat(out)
    }
    const len = b.readUInt16BE(i + 2)
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe // APP1 EXIF/XMP, APP13 IPTC, COM
    if (!drop) out.push(b.subarray(i, i + 2 + len))
    i += 2 + len
  }
  out.push(b.subarray(i))
  return Buffer.concat(out)
}

function stripPng(b: Buffer): Buffer {
  const out: Buffer[] = [b.subarray(0, 8)]
  let i = 8
  const drop = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"])
  while (i + 12 <= b.length) {
    const len = b.readUInt32BE(i)
    const type = b.toString("latin1", i + 4, i + 8)
    const end = i + 12 + len
    if (!drop.has(type)) out.push(b.subarray(i, end))
    i = end
    if (type === "IEND") break
  }
  return Buffer.concat(out)
}

function stripWebp(b: Buffer): Buffer {
  const chunks: Buffer[] = []
  let i = 12
  while (i + 8 <= b.length) {
    const type = b.toString("latin1", i, i + 4)
    const len = b.readUInt32LE(i + 4)
    const end = i + 8 + len + (len % 2) // chunks are padded to even sizes
    if (type !== "EXIF" && type !== "XMP ") {
      const c = Buffer.from(b.subarray(i, end))
      if (type === "VP8X") c[8] &= ~(0x08 | 0x04) // clear EXIF + XMP present flags
      chunks.push(c)
    }
    i = end
  }
  const body = Buffer.concat(chunks)
  const header = Buffer.alloc(12)
  header.write("RIFF", 0, "latin1")
  header.writeUInt32LE(body.length + 4, 4)
  header.write("WEBP", 8, "latin1")
  return Buffer.concat([header, body])
}

export function stripImageMetadata(b: Buffer): { type: ImageType; data: Buffer } | null {
  const type = sniffImage(b)
  if (!type) return null
  const data = type === "image/jpeg" ? stripJpeg(b) : type === "image/png" ? stripPng(b) : stripWebp(b)
  return { type, data }
}
