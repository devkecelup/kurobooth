import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export function generateShareCode(): string {
  return nanoid()
}

export function getShareUrl(shareCode: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/result/${shareCode}`
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base}/result/${shareCode}`
}

/**
 * Draws a rounded rectangle path on a canvas context
 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Converts a data URL to a Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Loads an image from a URL or data URL, returns HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export type PhotoAdjustment = {
  zoom: number // 0.8 to 3.0 (default: 1.0)
  offsetX: number // -50 to 50 percent (default: 0)
  offsetY: number // -50 to 50 percent (default: 0)
}

/**
 * Draws an image covering a slot with full-range Zoom & Pan adjustments (both horizontal & vertical)
 */
export function drawImageAdjusted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  adjust?: PhotoAdjustment
) {
  const zoom = Math.max(0.8, Math.min(3.5, adjust?.zoom ?? 1))
  const offX = Math.max(-60, Math.min(60, adjust?.offsetX ?? 0))
  const offY = Math.max(-60, Math.min(60, adjust?.offsetY ?? 0))

  // Calculate base scale to cover the slot
  const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const scale = baseScale * zoom

  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale

  // Center position within the slot
  const centerX = x + w / 2
  const centerY = y + h / 2

  // User pan offset in pixels relative to slot size
  const panPxX = (offX / 50) * (w * 0.5)
  const panPxY = (offY / 50) * (h * 0.5)

  const drawX = centerX - drawW / 2 + panPxX
  const drawY = centerY - drawH / 2 + panPxY

  ctx.drawImage(img, drawX, drawY, drawW, drawH)
}

/**
 * Draws an image covering a slot (object-fit: cover behavior)
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  drawImageAdjusted(ctx, img, x, y, w, h)
}
