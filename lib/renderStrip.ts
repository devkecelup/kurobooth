import { TemplateConfig } from './templates'
import { roundRect, loadImage, drawImageAdjusted, PhotoAdjustment } from './utils'

/**
 * Renders the full photobooth strip to a canvas context.
 * Single source of truth for final high-res output rendering.
 */
export async function renderStripToCanvas(
  ctx: CanvasRenderingContext2D,
  template: TemplateConfig,
  photos: string[],
  adjustments?: (PhotoAdjustment | undefined)[],
  scale: number = 2
): Promise<void> {
  const baseW = template.stripWidth || 600
  const baseH = template.stripHeight || 1800

  ctx.save()
  if (scale !== 1) {
    ctx.scale(scale, scale)
  }

  // 1. Draw solid background
  ctx.fillStyle = template.backgroundColor
  ctx.fillRect(0, 0, baseW, baseH)

  // 2. Draw background image if frameMode is 'background'
  if (template.frameImageUrl && template.frameMode === 'background') {
    try {
      const bgImg = await loadImage(template.frameImageUrl)
      ctx.drawImage(bgImg, 0, 0, baseW, baseH)
    } catch (err) {
      console.warn('Failed to load background frame image:', err)
    }
  }

  // 3. Draw outer border (only if not using a full custom frame)
  if (!template.frameImageUrl) {
    ctx.strokeStyle = template.accentColor
    ctx.lineWidth = 3
    ctx.strokeRect(10, 10, baseW - 20, baseH - 20)
  }

  // 4. Load and draw photos into slots
  for (let i = 0; i < template.slots.length; i++) {
    const slot = template.slots[i]
    const photoSrc = photos[i]
    const adjust = adjustments?.[i]

    if (!photoSrc) continue

    try {
      const img = await loadImage(photoSrc)

      ctx.save()

      if (slot.borderRadius && slot.borderRadius > 0) {
        roundRect(ctx, slot.x, slot.y, slot.width, slot.height, slot.borderRadius)
        ctx.clip()
      } else {
        ctx.beginPath()
        ctx.rect(slot.x, slot.y, slot.width, slot.height)
        ctx.clip()
      }

      drawImageAdjusted(ctx, img, slot.x, slot.y, slot.width, slot.height, adjust)

      ctx.restore()
    } catch (err) {
      console.error(`Failed to load photo ${i}:`, err)
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height)
    }
  }

  // 5. Draw Canva Overlay Frame on top of photos (if frameMode is 'overlay')
  if (template.frameImageUrl && template.frameMode !== 'background') {
    try {
      const frameImg = await loadImage(template.frameImageUrl)
      ctx.drawImage(frameImg, 0, 0, baseW, baseH)
    } catch (err) {
      console.warn('Failed to load overlay frame image:', err)
    }
  }

  // 6. Draw decorations (rendered OVER photos & frame)
  template.decorations?.forEach(dec => {
    ctx.save()
    ctx.globalAlpha = dec.opacity ?? 1

    switch (dec.type) {
      case 'text':
        ctx.fillStyle = dec.color ?? template.textColor
        ctx.font = `${dec.fontSize ?? 18}px ${dec.fontFamily ?? 'sans-serif'}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(dec.text ?? '', dec.x ?? 0, dec.y ?? 0)
        break

      case 'rect':
        ctx.fillStyle = dec.color ?? template.accentColor
        ctx.fillRect(dec.x ?? 0, dec.y ?? 0, dec.width ?? 0, dec.height ?? 0)
        break

      case 'line':
        ctx.strokeStyle = dec.color ?? template.accentColor
        ctx.lineWidth = dec.height ?? 1
        ctx.beginPath()
        ctx.moveTo(dec.x ?? 0, dec.y ?? 0)
        ctx.lineTo((dec.x ?? 0) + (dec.width ?? 0), dec.y ?? 0)
        ctx.stroke()
        break

      case 'circle':
        ctx.fillStyle = dec.color ?? template.accentColor
        ctx.beginPath()
        ctx.arc(dec.x ?? 0, dec.y ?? 0, dec.width ?? 10, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'svg':
        if (dec.path) {
          ctx.translate(dec.x ?? 0, dec.y ?? 0)
          if (dec.scale) ctx.scale(dec.scale, dec.scale)
          const p = new Path2D(dec.path)
          if (dec.fill || dec.color) {
            ctx.fillStyle = dec.fill || dec.color || template.accentColor
            ctx.fill(p)
          }
          if (dec.stroke) {
            ctx.strokeStyle = dec.stroke
            ctx.lineWidth = dec.strokeWidth || 2
            ctx.stroke(p)
          }
        }
        break
    }

    ctx.restore()
  })

  ctx.restore()
}