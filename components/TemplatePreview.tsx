'use client'

import { useEffect, useRef, useState } from 'react'
import { TemplateConfig } from '@/lib/templates'
import { roundRect, drawImageAdjusted, PhotoAdjustment } from '@/lib/utils'
import { RefreshIcon } from '@/components/Icons'
import styles from './TemplatePreview.module.css'

interface Props {
  template: TemplateConfig
  isHovered?: boolean
  photos?: (string | null)[]
  adjustments?: (PhotoAdjustment | undefined)[]
  onAdjustSlot?: (index: number, adj: PhotoAdjustment) => void
  onSelectSlot?: (index: number) => void
  onRetakeSlot?: (index: number) => void
  priority?: boolean
}

export default function TemplatePreview({
  template,
  photos,
  adjustments,
  onAdjustSlot,
  onSelectSlot,
  onRetakeSlot,
  priority = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(priority || !!photos?.length)
  const renderedRef = useRef(false)

  const dragRef = useRef<{
    isDragging: boolean
    slotIndex: number
    startX: number
    startY: number
    startOffX: number
    startOffY: number
    zoom: number
  }>({ isDragging: false, slotIndex: -1, startX: 0, startY: 0, startOffX: 0, startOffY: 0, zoom: 1 })

  // IntersectionObserver for lazy offscreen rendering
  useEffect(() => {
    if (priority || photos?.length || isVisible) {
      setIsVisible(true)
      return
    }

    const elem = containerRef.current
    if (!elem || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' } // Pre-render 300px before scrolling into view
    )

    observer.observe(elem)
    return () => observer.disconnect()
  }, [priority, photos?.length, isVisible])

  useEffect(() => {
    if (isVisible) {
      renderPreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, photos, adjustments, isVisible])

  function getSlotAtPos(clientX: number, clientY: number): number {
    const canvas = canvasRef.current
    if (!canvas) return -1
    const rect = canvas.getBoundingClientRect()
    const W = template.stripWidth || 600
    const H = template.stripHeight || 1800

    const canvasX = ((clientX - rect.left) / rect.width) * W
    const canvasY = ((clientY - rect.top) / rect.height) * H

    for (let i = 0; i < template.slots.length; i++) {
      const slot = template.slots[i]
      if (
        canvasX >= slot.x &&
        canvasX <= slot.x + slot.width &&
        canvasY >= slot.y &&
        canvasY <= slot.y + slot.height
      ) {
        return i
      }
    }
    return -1
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!onAdjustSlot) return
    const slotIdx = getSlotAtPos(e.clientX, e.clientY)
    if (slotIdx === -1 || !photos?.[slotIdx]) return

    e.currentTarget.setPointerCapture(e.pointerId)
    const currAdj = adjustments?.[slotIdx] || { zoom: 1, offsetX: 0, offsetY: 0 }
    dragRef.current = {
      isDragging: true,
      slotIndex: slotIdx,
      startX: e.clientX,
      startY: e.clientY,
      startOffX: currAdj.offsetX,
      startOffY: currAdj.offsetY,
      zoom: currAdj.zoom,
    }
    onSelectSlot?.(slotIdx)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current.isDragging || !onAdjustSlot) return
    const { slotIndex, startX, startY, startOffX, startOffY, zoom } = dragRef.current
    const dx = (e.clientX - startX) * 0.4
    const dy = (e.clientY - startY) * 0.4

    const nextX = Math.max(-50, Math.min(50, startOffX + dx))
    const nextY = Math.max(-50, Math.min(50, startOffY + dy))

    onAdjustSlot(slotIndex, { zoom, offsetX: nextX, offsetY: nextY })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current.isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
      dragRef.current.isDragging = false
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    if (!onAdjustSlot) return
    const slotIdx = getSlotAtPos(e.clientX, e.clientY)
    if (slotIdx === -1 || !photos?.[slotIdx]) return

    e.preventDefault()
    const currAdj = adjustments?.[slotIdx] || { zoom: 1, offsetX: 0, offsetY: 0 }
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const nextZoom = Math.max(0.8, Math.min(2.5, Number((currAdj.zoom + delta).toFixed(2))))

    onSelectSlot?.(slotIdx)
    onAdjustSlot(slotIdx, { ...currAdj, zoom: nextZoom })
  }

  function renderPreview() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = template.stripWidth || 600
    const H = template.stripHeight || 1800

    if (canvas.width !== W) canvas.width = W
    if (canvas.height !== H) canvas.height = H

    // 1. Draw solid background
    ctx.fillStyle = template.backgroundColor || '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Function to render remaining layers once background is ready
    const continueRender = () => {
      // Draw outer border only if no custom frame image
      if (!template.frameImageUrl) {
        ctx.strokeStyle = template.accentColor || '#E2E8E4'
        ctx.lineWidth = 3
        ctx.strokeRect(10, 10, W - 20, H - 20)
      }

      // Draw photo slots
      template.slots.forEach((slot, i) => {
        const photo = photos?.[i]
        const adjust = adjustments?.[i]

        if (photo) {
          const img = new Image()
          img.src = photo
          img.onload = () => {
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

            // Draw overlay & decorations on top of photo
            drawOverlayAndDecorations(ctx, template, W, H)
          }
        } else {
          // Placeholder gradient
          ctx.save()
          if (slot.borderRadius && slot.borderRadius > 0) {
            roundRect(ctx, slot.x, slot.y, slot.width, slot.height, slot.borderRadius)
            ctx.clip()
          }
          const gradient = ctx.createLinearGradient(slot.x, slot.y, slot.x + slot.width, slot.y + slot.height)
          gradient.addColorStop(0, lightenColor(template.backgroundColor || '#FFFFFF', 12))
          gradient.addColorStop(1, lightenColor(template.backgroundColor || '#FFFFFF', 4))
          ctx.fillStyle = gradient
          ctx.fillRect(slot.x, slot.y, slot.width, slot.height)
          ctx.restore()

          // Draw vector camera icon
          drawMinimalCameraIcon(
            ctx,
            slot.x + slot.width / 2,
            slot.y + slot.height / 2,
            slot.width * 0.14,
            template.textColor || '#0C1E14'
          )
        }
      })

      // Draw overlay frame and decorations
      drawOverlayAndDecorations(ctx, template, W, H)
      renderedRef.current = true
    }

    // If background frame image exists, load it first
    if (template.frameImageUrl && template.frameMode === 'background') {
      const bgImg = new Image()
      bgImg.crossOrigin = 'anonymous'
      bgImg.src = template.frameImageUrl
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, W, H)
        continueRender()
      }
      bgImg.onerror = () => continueRender()
    } else {
      continueRender()
    }
  }

    const W = template.stripWidth || 600
    const H = template.stripHeight || 1800

    return (
      <div
        ref={containerRef}
        className={styles.previewContainer}
        style={{
          background: template.backgroundColor || '#FFFFFF',
        }}
      >
        <div
          className={styles.canvasWrapper}
          style={{
            aspectRatio: `${W} / ${H}`,
          }}
        >
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{
              touchAction: onAdjustSlot ? 'none' : 'auto',
              cursor: onAdjustSlot ? 'grab' : 'default',
            }}
            title={onAdjustSlot ? 'Klik & geser langsung di foto untuk memposisikan wajah | Scroll mouse untuk zoom' : undefined}
            aria-label={`Preview template ${template.name}`}
          />

          {/* Interactive overlays positioned over each photo slot for WYSIWYG adjust & retake */}
          {template.slots.map((slot, i) => {
            const photo = photos?.[i]
            if (!photo || (!onAdjustSlot && !onRetakeSlot)) return null
            const isDragging = dragRef.current.isDragging && dragRef.current.slotIndex === i
            const currZoom = adjustments?.[i]?.zoom ?? 1

            return (
              <div
                key={i}
                className={`${styles.slotOverlay} ${onAdjustSlot ? styles.slotOverlayInteractive : ''} ${isDragging ? styles.slotOverlayDragging : ''}`}
                style={{
                  left: `${(slot.x / W) * 100}%`,
                  top: `${(slot.y / H) * 100}%`,
                  width: `${(slot.width / W) * 100}%`,
                  height: `${(slot.height / H) * 100}%`,
                }}
                onPointerDown={(e) => {
                  if (!onAdjustSlot) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const currAdj = adjustments?.[i] || { zoom: 1, offsetX: 0, offsetY: 0 }
                  dragRef.current = {
                    isDragging: true,
                    slotIndex: i,
                    startX: e.clientX,
                    startY: e.clientY,
                    startOffX: currAdj.offsetX,
                    startOffY: currAdj.offsetY,
                    zoom: currAdj.zoom,
                  }
                  onSelectSlot?.(i)
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current.isDragging || dragRef.current.slotIndex !== i || !onAdjustSlot) return
                  const { startX, startY, startOffX, startOffY, zoom } = dragRef.current
                  const dx = (e.clientX - startX) * 0.4
                  const dy = (e.clientY - startY) * 0.4
                  const nextX = Math.max(-50, Math.min(50, startOffX + dx))
                  const nextY = Math.max(-50, Math.min(50, startOffY + dy))
                  onAdjustSlot(i, { zoom, offsetX: nextX, offsetY: nextY })
                }}
                onPointerUp={(e) => {
                  if (dragRef.current.isDragging && dragRef.current.slotIndex === i) {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    } catch {}
                    dragRef.current.isDragging = false
                  }
                }}
                onWheel={(e) => {
                  if (!onAdjustSlot) return
                  e.preventDefault()
                  const currAdj = adjustments?.[i] || { zoom: 1, offsetX: 0, offsetY: 0 }
                  const delta = e.deltaY > 0 ? -0.05 : 0.05
                  const nextZoom = Math.max(0.8, Math.min(2.5, Number((currAdj.zoom + delta).toFixed(2))))
                  onSelectSlot?.(i)
                  onAdjustSlot(i, { ...currAdj, zoom: nextZoom })
                }}
                title="Klik & geser langsung untuk pas-kan muka | Scroll untuk zoom"
              >
                {onRetakeSlot && (
                  <button
                    type="button"
                    className={styles.slotRetakeBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRetakeSlot(i)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title={`Foto ulang foto ke-${i + 1}`}
                    aria-label={`Foto ulang foto ke-${i + 1}`}
                  >
                    <RefreshIcon size={12} />
                    <span>Retake</span>
                  </button>
                )}

                <div className={styles.slotBottomBar}>
                  {currZoom !== 1 && (
                    <span className={styles.slotZoomPill}>{currZoom.toFixed(1)}x</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

function drawOverlayAndDecorations(
  ctx: CanvasRenderingContext2D,
  template: TemplateConfig,
  W: number,
  H: number
) {
  // Draw Canva Overlay Frame on top of photos
  if (template.frameImageUrl && template.frameMode !== 'background') {
    const frameImg = new Image()
    frameImg.crossOrigin = 'anonymous'
    frameImg.src = template.frameImageUrl
    frameImg.onload = () => {
      ctx.drawImage(frameImg, 0, 0, W, H)
      renderDecorations(ctx, template)
    }
    frameImg.onerror = () => renderDecorations(ctx, template)
  } else {
    renderDecorations(ctx, template)
  }
}

function drawMinimalCameraIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const w = size * 1.5
  const h = size * 1.1
  const x = cx - w / 2
  const y = cy - h / 2

  roundRect(ctx, x, y + h * 0.15, w, h * 0.85, size * 0.15)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + w * 0.3, y + h * 0.15)
  ctx.lineTo(x + w * 0.38, y)
  ctx.lineTo(x + w * 0.62, y)
  ctx.lineTo(x + w * 0.7, y + h * 0.15)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy + h * 0.08, size * 0.32, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function renderDecorations(
  ctx: CanvasRenderingContext2D,
  template: TemplateConfig
) {
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
}

function lightenColor(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`
  }
  const num = parseInt(cleanHex, 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `rgb(${r},${g},${b})`
}