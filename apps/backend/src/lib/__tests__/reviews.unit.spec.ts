import { stripImageMetadata } from "../image-privacy"
import { canEdit, canReview, findBlockedWord, publicName, qualifiesForIncentive, summarize } from "../review-rules"

// Minimal real image byte layouts with a GPS-bearing metadata block.
const GPS = Buffer.from("Exif\0\0GPSLatitude 19.99N GPSLongitude 73.78E")
function jpegWithExif() {
  const seg = (marker: number, body: Buffer) => Buffer.concat([Buffer.from([0xff, marker]), Buffer.from([((body.length + 2) >> 8) & 0xff, (body.length + 2) & 0xff]), body])
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", "latin1")),
    seg(0xe1, GPS),
    seg(0xdb, Buffer.alloc(67, 1)),
    Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0xaa, 0xbb, 0xff, 0xd9]),
  ])
}
function pngWithExif() {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    return Buffer.concat([len, Buffer.from(type, "latin1"), data, Buffer.alloc(4)])
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", Buffer.alloc(13)), chunk("eXIf", GPS), chunk("tEXt", Buffer.from("Comment\0Nashik")), chunk("IDAT", Buffer.alloc(10, 7)), chunk("IEND", Buffer.alloc(0))])
}
function webpWithExif() {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32LE(data.length)
    return Buffer.concat([Buffer.from(type, "latin1"), len, data, Buffer.alloc(data.length % 2)])
  }
  const vp8x = Buffer.alloc(10)
  vp8x[0] = 0x08 // EXIF flag
  const body = Buffer.concat([chunk("VP8X", vp8x), chunk("VP8 ", Buffer.alloc(20, 3)), chunk("EXIF", GPS)])
  const head = Buffer.alloc(12)
  head.write("RIFF", 0, "latin1")
  head.writeUInt32LE(body.length + 4, 4)
  head.write("WEBP", 8, "latin1")
  return Buffer.concat([head, body])
}

describe("photo privacy", () => {
  it.each([
    ["JPEG", jpegWithExif(), "image/jpeg"],
    ["PNG", pngWithExif(), "image/png"],
    ["WebP", webpWithExif(), "image/webp"],
  ])("strips EXIF/GPS from %s and keeps the image data", (_n, input, type) => {
    const r = stripImageMetadata(input as Buffer)!
    expect(r.type).toBe(type)
    expect(r.data.includes("GPSLatitude")).toBe(false)
    expect(r.data.includes("Nashik")).toBe(false)
    expect(r.data.length).toBeLessThan((input as Buffer).length)
  })
  it("keeps JPEG scan data and WebP sizes consistent", () => {
    const j = stripImageMetadata(jpegWithExif())!.data
    expect(j.subarray(-4).equals(Buffer.from([0xaa, 0xbb, 0xff, 0xd9]))).toBe(true)
    const w = stripImageMetadata(webpWithExif())!.data
    expect(w.readUInt32LE(4)).toBe(w.length - 8)
    expect(w[20] & 0x08).toBe(0) // VP8X EXIF flag cleared
  })
  it("refuses anything that isn't JPEG/PNG/WebP", () => {
    expect(stripImageMetadata(Buffer.from("<svg onload=alert(1)>"))).toBeNull()
  })
})

describe("who can review", () => {
  it("only delivered, not cancelled, once per item", () => {
    expect(canReview({ delivered: true, orderCancelled: false }).ok).toBe(true)
    expect(canReview({ delivered: false, orderCancelled: false }).ok).toBe(false)
    expect(canReview({ delivered: true, orderCancelled: true }).ok).toBe(false)
    expect(canReview({ delivered: true, orderCancelled: false, existing: { status: "rejected" } }).ok).toBe(false)
  })
  it("edits only while pending", () => {
    expect(canEdit("pending")).toBe(true)
    expect(canEdit("approved")).toBe(false)
    expect(canEdit("rejected")).toBe(false)
  })
  it("shows first name, surname initial and city only", () => {
    expect(publicName("priya ananya", "Sharma", "nashik")).toBe("Priya S., Nashik")
    expect(publicName("", "Sharma", "Pune")).toBe("Verified buyer")
    expect(publicName("Ravi", null, null)).toBe("Ravi")
  })
})

describe("ratings maths", () => {
  it("averages to one decimal with a 5→1 breakdown", () => {
    expect(summarize([5, 5, 4, 3, 1])).toEqual({ count: 5, average: 3.6, breakdown: { 1: 1, 2: 0, 3: 1, 4: 1, 5: 2 } })
    expect(summarize([])).toEqual({ count: 0, average: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
    expect(summarize([4, 5]).average).toBe(4.5)
  })
})

describe("spam + incentive", () => {
  it("matches blocked words as whole words", () => {
    expect(findBlockedWord("Visit casino now", "casino, http://")).toBe("casino")
    expect(findBlockedWord("Occasional use", "casino")).toBeNull()
    expect(findBlockedWord("see http://spam.example", "casino\nhttp://")).toBe("http://")
  })
  it("coupon only when switched on, once, and with a photo if required", () => {
    const on = { incentive_enabled: true, incentive_requires_photo: true }
    expect(qualifiesForIncentive(on, { photos: ["a.jpg"] })).toBe(true)
    expect(qualifiesForIncentive(on, { photos: [] })).toBe(false)
    expect(qualifiesForIncentive({ ...on, incentive_enabled: false }, { photos: ["a.jpg"] })).toBe(false)
    expect(qualifiesForIncentive(on, { photos: ["a.jpg"], incentive_code: "REV-1" })).toBe(false)
  })
})
