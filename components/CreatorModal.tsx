'use client'

import { useState, useCallback, useRef } from 'react'
import {
  CloseIcon,
  UploadIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyedropperIcon,
} from '@/components/Icons'
import Mascot from './Mascot'
import TemplatePreview from './TemplatePreview'
import { TemplateConfig } from '@/lib/templates'
import styles from './CreatorModal.module.css'

interface SlotDef {
  x: number
  y: number
  width: number
  height: number
  borderRadius?: number
}

const PRESET_4_VERTICAL: SlotDef[] = [
  { x: 40, y: 60, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 450, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 840, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 1230, width: 520, height: 360, borderRadius: 8 },
]

const PRESET_2_VERTICAL: SlotDef[] = [
  { x: 40, y: 80, width: 520, height: 680, borderRadius: 14 },
  { x: 40, y: 820, width: 520, height: 680, borderRadius: 14 },
]

const PRESET_3_VERTICAL = [
  { x: 40, y: 70, width: 520, height: 450, borderRadius: 12 },
  { x: 40, y: 560, width: 520, height: 450, borderRadius: 12 },
  { x: 40, y: 1050, width: 520, height: 450, borderRadius: 12 },
]

const PRESET_6_GRID = [
  { x: 40, y: 80, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 80, width: 245, height: 340, borderRadius: 6 },
  { x: 40, y: 460, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 460, width: 245, height: 340, borderRadius: 6 },
  { x: 40, y: 840, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 840, width: 245, height: 340, borderRadius: 6 },
]

// Convert Hex to RGB
function hexToRgb(hex: string) {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const num = parseInt(c, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

// Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Convert RGB to HSV for perceptual color difference
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

// Automatically remove isolated opaque specks/dots inside transparent photo holes (Despeckle)
function cleanIsolatedSpecks(imgData: ImageData, maxSpeckSize: number = 1000) {
  if (maxSpeckSize <= 0) return;
  const { width, height, data } = imgData;
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const alpha = data[idx * 4 + 3];
      if (alpha > 64) {
        const queue: number[] = [idx];
        visited[idx] = 1;
        const component: number[] = [];
        let touchesBorder = false;
        let isLarge = false;

        let qHead = 0;
        while (qHead < queue.length) {
          const curr = queue[qHead++];
          component.push(curr);
          
          // IMPORTANT: Do NOT break early here! If we break early, we leave an artificial 
          // boundary of unvisited pixels. The next iteration will hit this artificial 
          // boundary, think it's a small isolated speck, and erase it, eating away the 
          // solid frame chunk by chunk. We must explore the ENTIRE component.
          if (component.length > maxSpeckSize) {
            isLarge = true;
          }

          const cx = curr % width;
          const cy = Math.floor(curr / width);

          if (cx <= 2 || cx >= width - 3 || cy <= 2 || cy >= height - 3) {
            touchesBorder = true;
          }

          const n1 = cy > 0 ? curr - width : -1;
          const n2 = cy < height - 1 ? curr + width : -1;
          const n3 = cx > 0 ? curr - 1 : -1;
          const n4 = cx < width - 1 ? curr + 1 : -1;

          if (n1 !== -1 && !visited[n1] && data[n1 * 4 + 3] > 64) { visited[n1] = 1; queue.push(n1); }
          if (n2 !== -1 && !visited[n2] && data[n2 * 4 + 3] > 64) { visited[n2] = 1; queue.push(n2); }
          if (n3 !== -1 && !visited[n3] && data[n3 * 4 + 3] > 64) { visited[n3] = 1; queue.push(n3); }
          if (n4 !== -1 && !visited[n4] && data[n4 * 4 + 3] > 64) { visited[n4] = 1; queue.push(n4); }
        }

        if (!isLarge && !touchesBorder) {
          for (let i = 0; i < component.length; i++) {
            data[component[i] * 4 + 3] = 0;
          }
        }
      }
    }
  }
}

// Detect transparent bounding boxes (cutout holes) from chroma-keyed frame
function detectTransparentSlots(imgData: ImageData, pad: number = 15): { x: number, y: number, width: number, height: number, borderRadius: number }[] {
  const { width, height, data } = imgData

  const rowTransparentCount = new Array(height).fill(0)
  for (let y = 0; y < height; y++) {
    let transparentPixels = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      if (data[idx + 3] < 100) {
        transparentPixels++
      }
    }
    if (transparentPixels > width * 0.15) {
      rowTransparentCount[y] = 1
    }
  }

  const segments: { yStart: number, yEnd: number }[] = []
  let inSegment = false
  let yStart = 0
  for (let y = 0; y < height; y++) {
    if (rowTransparentCount[y] && !inSegment) {
      inSegment = true
      yStart = y
    } else if (!rowTransparentCount[y] && inSegment) {
      inSegment = false
      if (y - yStart > 80) {
        segments.push({ yStart, yEnd: y })
      }
    }
  }
  if (inSegment && height - yStart > 80) {
    segments.push({ yStart, yEnd: height })
  }

  if (segments.length === 0) return []

  const detectedSlots = segments.map(seg => {
    let xMin = width
    let xMax = 0
    for (let y = seg.yStart; y < seg.yEnd; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        if (data[idx + 3] < 100) {
          if (x < xMin) xMin = x
          if (x > xMax) xMax = x
        }
      }
    }

    if (xMin >= xMax) {
      xMin = 30
      xMax = width - 30
    }

    const slotX = Math.max(0, xMin - pad)
    const slotY = Math.max(0, seg.yStart - pad)
    const slotW = Math.min(width - slotX, (xMax - xMin) + pad * 2)
    const slotH = Math.min(height - slotY, (seg.yEnd - seg.yStart) + pad * 2)

    return {
      x: slotX,
      y: slotY,
      width: slotW,
      height: slotH,
      borderRadius: 16,
    }
  })

  return detectedSlots
}

// Process Image Chroma Key — uses flood-fill from image border so ONLY
// pixels connected to the chroma-colored "background" are made transparent.
// Frame decoration that coincidentally shares the chroma color is protected
// because it is not reachable from the image edge.
async function applyChromaKey(
  imageSrc: string,
  chromaHex: string,
  tolerance: number = 20,
  smoothness: number = 5,
  slotPadding: number = 15,
  despeckle: number = 600
): Promise<{ dataUrl: string, detectedSlots: SlotDef[] }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 600
      canvas.height = img.naturalHeight || 1800
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve({ dataUrl: imageSrc, detectedSlots: [] })

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data
      const { width, height } = imgData

      const target = hexToRgb(chromaHex)
      const targetHsv = rgbToHsv(target.r, target.g, target.b)
      const isTargetSaturated = targetHsv.s > 25

      // Scale tolerance to Euclidean-style distance
      const tolDist = (tolerance / 100) * 380
      // Smoothness: pixels within this extra range get partial transparency
      const smoothRange = (smoothness / 100) * 80

      // Helper: compute how different a pixel is from the chroma color
      function colorDist(r: number, g: number, b: number): number {
        if (isTargetSaturated) {
          const pixHsv = rgbToHsv(r, g, b)
          let hueDiff = Math.abs(pixHsv.h - targetHsv.h)
          if (hueDiff > 180) hueDiff = 360 - hueDiff
          const satDiff = Math.abs(pixHsv.s - targetHsv.s)
          const valDiff = Math.abs(pixHsv.v - targetHsv.v)
          // Weight hue heavily for saturated targets (green/blue/magenta screens)
          return (hueDiff / 180) * 280 + (satDiff / 100) * 60 + (valDiff / 100) * 40
        } else {
          // Non-saturated (white/black/gray) — use RGB Euclidean
          return Math.sqrt((r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2)
        }
      }

      // --- Phase 1: flood-fill dari tepi — hanya pixel yang SANGAT cocok dengan warna
      // chroma yang bisa jadi seed (threshold ketat). Ini mencegah artefak JPEG atau
      // pixel frame yang sedikit mirip chroma dari men-trigger flood fill.
      const inRegion = new Uint8Array(width * height)
      const queue: number[] = []

      // Seed threshold: harus match KUAT (bukan cuma dalam smoothRange) untuk mulai dari tepi
      const seedThreshold = tolDist * 0.6

      function enqueueEdge(px: number) {
        if (inRegion[px]) return
        const i = px * 4
        // Pixel tepi harus punya ALPHA penuh (bukan sudah transparan)
        if (data[i + 3] < 200) { inRegion[px] = 2; return }
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        // Threshold ketat untuk edge seed — hanya warna yang BENAR-BENAR cocok
        inRegion[px] = dist <= seedThreshold ? 1 : 2
        if (inRegion[px] === 1) queue.push(px)
      }

      function enqueueNeighbor(px: number) {
        if (inRegion[px]) return
        const i = px * 4
        if (data[i + 3] < 200) { inRegion[px] = 2; return }
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        // Propagasi lebih longgar (tolDist + smoothRange) setelah seed dikonfirmasi
        inRegion[px] = dist <= tolDist + smoothRange ? 1 : 2
        if (inRegion[px] === 1) queue.push(px)
      }

      // Seed dari 4 sisi dengan threshold ketat
      for (let x = 0; x < width; x++) {
        enqueueEdge(x)
        enqueueEdge((height - 1) * width + x)
      }
      for (let y = 1; y < height - 1; y++) {
        enqueueEdge(y * width)
        enqueueEdge(y * width + width - 1)
      }

      let head = 0
      while (head < queue.length) {
        const px = queue[head++]
        const cx = px % width
        const cy = Math.floor(px / width)
        const neighbors = [
          cy > 0          ? px - width     : -1,
          cy < height - 1 ? px + width     : -1,
          cx > 0          ? px - 1         : -1,
          cx < width - 1  ? px + 1         : -1,
        ]
        for (const n of neighbors) {
          if (n >= 0) enqueueNeighbor(n)
        }
      }

      // --- Phase 2: also erase INTERIOR solid chroma-colored holes (photo slots) ---
      // These are enclosed rectangles of pure chroma color not touching the border.
      // We flood-fill from unvisited interior pixels that match the chroma.
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          const px = y * width + x
          if (inRegion[px]) continue
          const i = px * 4
          const dist = colorDist(data[i], data[i + 1], data[i + 2])
          if (dist > tolDist) continue
          // Found an interior chroma pixel — flood fill this pocket
          const pocketQueue = [px]
          inRegion[px] = 1
          let pHead = 0
          while (pHead < pocketQueue.length) {
            const ppx = pocketQueue[pHead++]
            const pcx = ppx % width
            const pcy = Math.floor(ppx / width)
            const pn = [
              pcy > 0          ? ppx - width     : -1,
              pcy < height - 1 ? ppx + width     : -1,
              pcx > 0          ? ppx - 1         : -1,
              pcx < width - 1  ? ppx + 1         : -1,
            ]
            for (const n of pn) {
              if (n >= 0 && !inRegion[n]) {
                const ni = n * 4
                const nd = colorDist(data[ni], data[ni + 1], data[ni + 2])
                if (nd <= tolDist + smoothRange) {
                  inRegion[n] = 1
                  pocketQueue.push(n)
                }
              }
            }
          }
        }
      }

      // --- Phase 3: apply transparency based on flood-fill result ---
      for (let px = 0; px < width * height; px++) {
        if (inRegion[px] !== 1) continue
        const i = px * 4
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        if (dist <= tolDist) {
          data[i + 3] = 0
        } else if (smoothRange > 0 && dist < tolDist + smoothRange) {
          // Smooth edge: partial transparency
          const ratio = (dist - tolDist) / smoothRange
          data[i + 3] = Math.min(data[i + 3], Math.round(255 * ratio * ratio)) // quadratic fade
        }
      }

      if (despeckle > 0) {
        cleanIsolatedSpecks(imgData, despeckle)
      }

      const detectedSlots = detectTransparentSlots(imgData, slotPadding)
      ctx.putImageData(imgData, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/webp', 0.95),
        detectedSlots,
      })
    }
    img.onerror = () => resolve({ dataUrl: imageSrc, detectedSlots: [] })
    img.src = imageSrc
  })
}

/** Convert any image dataURL (JPG/PNG/etc) to WebP dataURL */
async function convertToWebP(dataUrl: string, quality: number = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/webp', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Convert a dataURL to a Blob */
function dataUrlToWebPBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/webp'
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onAddCustomTemplate?: (t: TemplateConfig) => void
}

export default function CreatorModal({ isOpen, onClose, onAddCustomTemplate }: Props) {
  // Stable unique ID — must not be recalculated on every render
  const customIdRef = useRef('custom-' + Date.now())
  const [name, setName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [description] = useState('')
  const [tags] = useState('komunitas, aesthetic')
  const [preset, setPreset] = useState<'2-vert' | '3-vert' | '4-vert' | '6-grid'>('4-vert')
  const [customSlots, setCustomSlots] = useState<SlotDef[]>(PRESET_4_VERTICAL)
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [accentColor, setAccentColor] = useState('#0D3B24')

  // Chroma Key State
  const [rawImageSrc, setRawImageSrc] = useState<string>('')
  const [processedFrameUrl, setProcessedFrameUrl] = useState<string>('')
  const [chromaEnabled, setChromaEnabled] = useState<boolean>(false)
  const [chromaColor, setChromaColor] = useState<string>('#00FF00')
  const [chromaTolerance, setChromaTolerance] = useState<number>(20)
  const [chromaSmoothness] = useState<number>(5)
  const [slotPadding] = useState<number>(15)
  const [autoTransparent, setAutoTransparent] = useState<boolean>(false)
  const [showText, setShowText] = useState<boolean>(true)
  const [detectedSlotCount, setDetectedSlotCount] = useState<number>(0)
  const [isProcessingChroma, setIsProcessingChroma] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reprocessChroma = useCallback(async (
    src: string,
    color: string,
    tol: number,
    smooth: number,
    enabled: boolean,
    pad: number = 15
  ) => {
    if (!src) return
    if (!enabled) {
      setProcessedFrameUrl(src)
      return
    }
    setIsProcessingChroma(true)
    try {
      const result = await applyChromaKey(src, color, tol, smooth, pad, 1200)
      setProcessedFrameUrl(result.dataUrl)
      if (result.detectedSlots && result.detectedSlots.length > 0) {
        setCustomSlots(result.detectedSlots)
        setDetectedSlotCount(result.detectedSlots.length)
        // Auto-select UI preset based on detected count
        if (result.detectedSlots.length === 2) setPreset('2-vert')
        else if (result.detectedSlots.length === 3) setPreset('3-vert')
        else if (result.detectedSlots.length === 4) setPreset('4-vert')
        else if (result.detectedSlots.length === 6) setPreset('6-grid')
      }
    } finally {
      setIsProcessingChroma(false)
    }
  }, [])

  if (!isOpen) return null

  const activeSlots = customSlots.length > 0 ? customSlots : (
    preset === '2-vert' ? PRESET_2_VERTICAL : preset === '3-vert' ? PRESET_3_VERTICAL : preset === '6-grid' ? PRESET_6_GRID : PRESET_4_VERTICAL
  )

  const previewConfig: TemplateConfig = {
    id: customIdRef.current,
    name: name || 'Custom Strip Desain',
    description: creatorName.trim()
      ? (creatorName.trim().startsWith('@') ? `Oleh ${creatorName.trim()}` : `Karya ${creatorName.trim()}`)
      : 'Karya Kreator Komunitas',
    photoCount: activeSlots.length,
    stripWidth: 600,
    stripHeight: 1800,
    backgroundColor: bgColor,
    accentColor: accentColor,
    textColor: '#0C1E14',
    frameImageUrl: processedFrameUrl || undefined,
    frameMode: 'overlay',
    slots: activeSlots,
    decorations: showText ? [
      { type: 'text', x: 300, y: 1680, text: (name || 'KUROBOOTH STRIP').toUpperCase(), fontSize: 16, fontFamily: 'Playfair Display, serif', color: accentColor, opacity: 0.95 },
      { type: 'text', x: 300, y: 1715, text: creatorName ? `BY ${creatorName.toUpperCase()}` : 'COMMUNITY EDITION', fontSize: 10, fontFamily: 'monospace', color: '#6B8574', opacity: 0.8 },
    ] : [],
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    printSize: '2x6',
  }

  function handlePresetChange(p: '2-vert' | '3-vert' | '4-vert' | '6-grid') {
    setPreset(p)
    if (p === '2-vert') setCustomSlots(PRESET_2_VERTICAL)
    if (p === '3-vert') setCustomSlots(PRESET_3_VERTICAL)
    if (p === '4-vert') setCustomSlots(PRESET_4_VERTICAL)
    if (p === '6-grid') setCustomSlots(PRESET_6_GRID)
    setDetectedSlotCount(0)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string
        setRawImageSrc(base64)
        setProcessedFrameUrl('')
        setAutoTransparent(false)
        setShowText(false) // Auto-hide default text when frame is uploaded

        // Auto-detect apakah gambar SUDAH punya transparansi (e.g. PNG with transparent slots)
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const cx = c.getContext('2d')
          if (!cx) return
          cx.drawImage(img, 0, 0)
          const { data } = cx.getImageData(0, 0, c.width, c.height)
          let transparentCount = 0
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 200) transparentCount++
          }
          const transparentRatio = transparentCount / (c.width * c.height)
          if (transparentRatio > 0.05) {
            // Gambar sudah punya transparansi yang cukup — nonaktifkan chroma key
            setChromaEnabled(false)
            setAutoTransparent(true)
            setProcessedFrameUrl(base64) // pakai gambar asli langsung

            // TETAP LAKUKAN DETEKSI SLOT walaupun tidak pakai chroma key
            const imgData = cx.getImageData(0, 0, c.width, c.height)
            const detected = detectTransparentSlots(imgData, slotPadding)
            if (detected && detected.length > 0) {
              setCustomSlots(detected)
              setDetectedSlotCount(detected.length)
              if (detected.length === 2) setPreset('2-vert')
              else if (detected.length === 3) setPreset('3-vert')
              else if (detected.length === 4) setPreset('4-vert')
              else if (detected.length === 6) setPreset('6-grid')
            }
          } else {
            // Gambar solid — aktifkan chroma key untuk menghapus kotak warna
            setChromaEnabled(true)
            setAutoTransparent(false)
            reprocessChroma(base64, chromaColor, chromaTolerance, chromaSmoothness, true, slotPadding)
          }
        }
        img.src = base64
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleEyeDropper() {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as { EyeDropper: new() => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
        const result = await eyeDropper.open()
        if (result?.sRGBHex) {
          const color = result.sRGBHex.toUpperCase()
          setChromaColor(color)
          setChromaEnabled(true)
          reprocessChroma(rawImageSrc, color, chromaTolerance, chromaSmoothness, true, slotPadding)
        }
      } catch {}
    } else {
      alert('Arahkan kursor dan klik pada bagian warna kotak foto pada gambar di bawah untuk mengambil warna!')
    }
  }

  function handleImageCanvasClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * (img.naturalWidth || 600))
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * (img.naturalHeight || 1800))

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 600
    canvas.height = img.naturalHeight || 1800
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2])

    setChromaColor(hex)
    setChromaEnabled(true)
    reprocessChroma(rawImageSrc, hex, chromaTolerance, chromaSmoothness, true, slotPadding)
  }

  function handleClose() {
    setSubmittedMessage(null)
    setErrorMsg(null)
    onClose()
  }

  // Submit to community (requires admin approval)
  async function handleSubmitToCommunity(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Nama template wajib diisi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      // Pastikan chroma key sudah diapply dengan setting terkini sebelum submit
      // (edge case: user upload gambar tapi belum pernah klik/ubah setting chroma)
      let baseFrameUrl = processedFrameUrl
      if (rawImageSrc && chromaEnabled && !processedFrameUrl) {
        try {
          const result = await applyChromaKey(rawImageSrc, chromaColor, chromaTolerance, chromaSmoothness, slotPadding)
          baseFrameUrl = result.dataUrl
          setProcessedFrameUrl(result.dataUrl)
        } catch {
          baseFrameUrl = rawImageSrc
        }
      }

      let finalFrameUrl = baseFrameUrl || rawImageSrc
      if (finalFrameUrl && finalFrameUrl.startsWith('data:')) {
        try {
          const { generateShareCode } = await import('@/lib/utils')
          // Convert frame ke WebP untuk loading gallery yang lebih cepat
          const webpDataUrl = await convertToWebP(finalFrameUrl, 0.92)
          const frameCode = 'frame-user-' + generateShareCode()
          const webpBlob = dataUrlToWebPBlob(webpDataUrl)
          const formData = new FormData()
          formData.append('file', webpBlob, frameCode + '.webp')
          formData.append('shareCode', frameCode)
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            if (uploadData.url) finalFrameUrl = uploadData.url
          }
        } catch (e) {
          console.warn('Frame upload error:', e)
        }
      }

      const creator = creatorName.trim()
      const formattedDesc = creator
        ? (creator.startsWith('@') ? `Oleh ${creator}` : `Karya ${creator}`)
        : 'Karya Kreator Komunitas'

      const payload = {
        name,
        creatorName: creator || 'Anonim',
        description: formattedDesc,
        photoCount: activeSlots.length,
        stripWidth: 600,
        stripHeight: 1800,
        backgroundColor: bgColor,
        accentColor: accentColor,
        textColor: '#0C1E14',
        frameImageUrl: finalFrameUrl || undefined,
        frameMode: 'overlay',
        slots: activeSlots,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        printSize: '2x6',
      }

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setSubmittedMessage(data.message || 'Template berhasil disumbangkan! Menunggu persetujuan kurasi admin.')
        if (data.template && onAddCustomTemplate) {
          onAddCustomTemplate(data.template)
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kurobooth:templates-updated'))
        }
      } else {
        setErrorMsg(data.error || 'Gagal mengirim template.')
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan saat mengirim template.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Tutup modal">
          <CloseIcon size={18} />
        </button>

        <div className={styles.modalHeader}>
          <Mascot pose="artist" size="sm" animated={false} />
          <div>
            <h2 className={styles.headerTitle}>Sumbang Template Komunitas</h2>
            <p className={styles.headerSubtitle}>
              Kreasikan desain template photobooth Canva buatanmu lalu sumbangkan ke KuroBooth agar dapat ditinjau admin dan dibagikan ke publik.
            </p>
          </div>
        </div>

        {submittedMessage ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Mascot pose="sparkle" size="lg" animated showSpeech speechText="Keren banget! Karyamu segera ditinjau admin!" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
              <CheckCircleIcon size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Template Berhasil Dikirim!</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {submittedMessage} Admin akan meninjau dan menerbitkan karyamu agar bisa dinikmati oleh seluruh pengguna KuroBooth.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handleClose}>
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.creatorGrid}>
            {/* Form Settings */}
            <form onSubmit={handleSubmitToCommunity} className={styles.formCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nama Template *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sakura Bloom Aesthetic"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nama Kreator / Instagram</label>
                <input
                  type="text"
                  className={styles.input}
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Contoh: @studio.kreatif"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Susunan Slot Foto</label>
                <div className={styles.presetGrid}>
                  <button
                    type="button"
                    className={`${styles.presetBtn} ${preset === '2-vert' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('2-vert')}
                  >
                    2 Foto Vertikal
                  </button>
                  <button
                    type="button"
                    className={`${styles.presetBtn} ${preset === '3-vert' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('3-vert')}
                  >
                    3 Foto Vertikal
                  </button>
                  <button
                    type="button"
                    className={`${styles.presetBtn} ${preset === '4-vert' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('4-vert')}
                  >
                    4 Foto Vertikal
                  </button>
                  <button
                    type="button"
                    className={`${styles.presetBtn} ${preset === '6-grid' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('6-grid')}
                  >
                    6 Foto Grid
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup} style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={showText}
                    onChange={(e) => setShowText(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent-1)' }}
                  />
                  Tampilkan Teks Watermark (Nama Template)
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, marginLeft: 24 }}>
                  Matikan ini jika kamu sudah mendesain teks sendiri di dalam frame gambarmu.
                </p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Upload Frame Canva (PNG Transparan / Berwarna)</label>
                <label className={styles.uploadBox}>
                  <UploadIcon size={24} style={{ color: 'var(--accent-1)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rawImageSrc ? 'Ganti File Frame Canva' : 'Pilih Gambar Frame Canva (PNG/JPG)'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rasio ideal 1:3 (600 × 1800 px)</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Chroma Key Engine Section (Like in Admin) */}
              {rawImageSrc && (
                <div className={styles.chromaBox}>
                  <div className={styles.chromaHeader}>
                    <span className={styles.chromaTitle}>Hapus Warna Kotak Foto (Chroma Key)</span>
                    <button
                      type="button"
                      className={styles.eyedropperBtn}
                      onClick={handleEyeDropper}
                    >
                      <EyedropperIcon size={14} />
                      <span>Pipet Warna</span>
                    </button>
                  </div>

                  {/* Info badge: transparansi auto-terdeteksi */}
                  {autoTransparent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#E8F5E9', border: '1px solid #A5D6A7', marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <span style={{ fontSize: '0.78rem', color: '#2E7D32', fontWeight: 600 }}>
                        Gambar sudah punya area transparan — Chroma Key dinonaktifkan otomatis.
                        Aktifkan manual jika kotak foto masih berwarna.
                      </span>
                    </div>
                  )}

                  {/* Toggle chroma key on/off */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={chromaEnabled}
                      onChange={(ev) => {
                        const enabled = ev.target.checked
                        setChromaEnabled(enabled)
                        reprocessChroma(rawImageSrc, chromaColor, chromaTolerance, chromaSmoothness, enabled, slotPadding)
                      }}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent-1)' }}
                    />
                    Aktifkan Chroma Key (Hapus warna kotak foto)
                  </label>

                  <div className={styles.chromaColors}>
                    {[
                      { name: 'Hijau Neon', hex: '#00FF00' },
                      { name: 'Magenta', hex: '#FF00FF' },
                      { name: 'Biru Cyan', hex: '#00FFFF' },
                      { name: 'Biru', hex: '#0000FF' },
                      { name: 'Kuning', hex: '#FFFF00' },
                      { name: 'Putih', hex: '#FFFFFF' },
                      { name: 'Hitam', hex: '#000000' },
                    ].map(presetColor => (
                      <button
                        type="button"
                        key={presetColor.hex}
                        className={`${styles.chromaColorBtn} ${chromaColor.toUpperCase() === presetColor.hex ? styles.chromaColorBtnActive : ''}`}
                        onClick={() => {
                          setChromaColor(presetColor.hex)
                          reprocessChroma(rawImageSrc, presetColor.hex, chromaTolerance, chromaSmoothness, true, slotPadding)
                        }}
                      >
                        <span className={styles.colorSwatch} style={{ background: presetColor.hex }} />
                        <span>{presetColor.name}</span>
                      </button>
                    ))}

                    <div className={styles.colorPickerWrap} style={{ marginLeft: 4 }}>
                      <input
                        type="color"
                        value={chromaColor}
                        onChange={(e) => {
                          setChromaColor(e.target.value)
                          reprocessChroma(rawImageSrc, e.target.value, chromaTolerance, chromaSmoothness, true, slotPadding)
                        }}
                        className={styles.colorInput}
                        title="Pilih warna kustom lainnya"
                      />
                      <span className={styles.chromaSliderValue}>{chromaColor}</span>
                    </div>
                  </div>

                  {/* Interactive Click-on-Image Picker */}
                  <div className={styles.interactivePickerBox}>
                    <div className={styles.interactivePickerTitle}>
                      <EyedropperIcon size={14} />
                      <span>Klik langsung pada kotak foto di gambar ini untuk menghapus warnanya:</span>
                    </div>
                    <img
                      src={rawImageSrc}
                      alt="Klik untuk ambil warna"
                      className={styles.interactivePickerImg}
                      onClick={handleImageCanvasClick}
                      title="Klik pada kotak foto berwarna untuk otomatis menghapus warnanya!"
                    />
                  </div>

                  {/* Tolerance Slider */}
                  <div className={styles.fieldGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0D3B24', fontWeight: 600 }}>
                      <span>Sensitivitas Toleransi Warna:</span>
                      <span>{chromaTolerance}%</span>
                    </div>
                    <div className={styles.chromaSliderWrap}>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={chromaTolerance}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setChromaTolerance(val)
                          reprocessChroma(rawImageSrc, chromaColor, val, chromaSmoothness, true, slotPadding)
                        }}
                        className={styles.chromaSlider}
                      />
                    </div>
                  </div>

                  {/* Auto Detection Badge */}
                  {detectedSlotCount > 0 && (
                    <div className={styles.uploadSuccessBadge}>
                      <CheckCircleIcon size={16} />
                      <span>Otomatis mendeteksi {detectedSlotCount} lubang kotak foto presisi dari desain Canva Anda!</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Warna Latar Belakang</label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                  />
                </div>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>Warna Aksen</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', fontSize: '0.8125rem' }}>
                  <AlertCircleIcon size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginTop: '6px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={isSubmitting || isProcessingChroma}
                >
                  <SparklesIcon size={18} />
                  <span>{isSubmitting ? 'Mengirim Template...' : 'Sumbang ke Publik'}</span>
                </button>
              </div>
            </form>

            {/* Live Strip Preview */}
            <div className={styles.previewCol}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                LIVE PREVIEW STRIP
              </span>
              <div className={styles.previewWrap}>
                <TemplatePreview template={previewConfig} priority />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
