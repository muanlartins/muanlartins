/**
 * The banner and the photo, drawn in the browser before they're sent: the part the viewer framed, at the size the site
 * shows (IMAGE_SIZE), as WebP (JPEG where the browser can't make WebP), stepping the quality down until it fits what the
 * profile API keeps. Drawing it again also leaves the file's metadata (where a phone took it) behind.
 */
import { IMAGE_SIZE, type ImageKind } from "@/lib/viewer"

/** The part of the picture to keep, in its own pixels. */
export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/** A file the viewer picked, as a picture to frame (null when it isn't one the browser can read). */
export function readPicture(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** The framed part at the site's size, small enough for the API; null if it can't get there. */
export async function drawPicture(source: HTMLImageElement, crop: Crop, kind: ImageKind): Promise<Blob | null> {
  const { width, height, max } = IMAGE_SIZE[kind]
  for (let scale = 1; scale >= 0.5; scale -= 0.15) {
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.86, 0.78, 0.68, 0.56, 0.44]) {
      let blob = await toBlob(canvas, "image/webp", quality)
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality)
      if (blob && blob.size <= max) return blob
    }
  }
  return null
}
