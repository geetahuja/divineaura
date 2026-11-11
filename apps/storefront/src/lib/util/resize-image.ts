/**
 * Browser-side: phone photo → JPEG data URL at most `max` px on the long side.
 * Re-encoding through a canvas also drops EXIF (incl. GPS location); the server
 * strips metadata again anyway. Smaller uploads on mobile data.
 */
export async function resizeImage(file: File, max = 1280, quality = 0.78): Promise<string> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", quality)
}
