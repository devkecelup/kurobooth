'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  WandIcon,
  CloseIcon,
  UploadIcon,
  PaletteIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyedropperIcon,
} from '@/components/Icons'
import Mascot from './Mascot'
import TemplatePreview from './TemplatePreview'
import { TemplateConfig } from '@/lib/templates'
import styles from './CreatorModal.module.css'

const PRESET_4_VERTICAL = [
  { x: 40, y: 60, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 450, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 840, width: 520, height: 360, borderRadius: 8 },
  { x: 40, y: 1230, width: 520, height: 360, borderRadius: 8 },
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
  let h = 0, s = 0, v = max;
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
          if (component.length > maxSpeckSize) {
            isLarge = true;
            break;
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
          for (const p of component) {
            data[p * 4 + 3] = 0;
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

// Process Image Chroma Key
async function applyChromaKey(
  imageSrc: string,
  chromaHex: string,
  tolerance: number = 35,
  smoothness: number = 5,
  slotPadding: number = 15,
  despeckle: number = 1000
): Promise<{ dataUrl: string, detectedSlots: any[] }> {
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

      const target = hexToRgb(chromaHex)
      const targetHsv = rgbToHsv(target.r, target.g, target.b)
      const isTargetSaturated = targetHsv.s > 25

      const tolDist = (tolerance / 100) * 441.67
      const smoothDist = (smoothness / 100) * 100

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        let dist = 0
        if (isTargetSaturated) {
          const pixHsv = rgbToHsv(r, g, b)
          let hueDiff = Math.abs(pixHsv.h - targetHsv.h)
          if (hueDiff > 180) hueDiff = 360 - hueDiff
          const satDiff = Math.abs(pixHsv.s - targetHsv.s)
          const valDiff = Math.abs(pixHsv.v - targetHsv.v)
          dist = (hueDiff / 180) * 320 + (satDiff / 100) * 80 + (valDiff / 100) * 60
        } else {
          dist = Math.sqrt((r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2)
        }

        if (dist <= tolDist) {
          data[i + 3] = 0
        } else if (smoothDist > 0 && dist < tolDist + smoothDist) {
          const ratio = (dist - tolDist) / smoothDist
          data[i + 3] = Math.min(data[i + 3], Math.round(255 * ratio))
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

interface Props {
  isOpen: boolean
  onClose: () => void
  onAddCustomTemplate?: (t: TemplateConfig) => void
}

export default function CreatorModal({ isOpen, onClose, onAddCustomTemplate }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('komunitas, aesthetic')
  const [preset, setPreset] = useState<'4-vert' | '3-vert' | '6-grid'>('4-vert')
  const [customSlots, setCustomSlots] = useState<any[]>(PRESET_4_VERTICAL)
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [accentColor, setAccentColor] = useState('#0D3B24')

  // Chroma Key State
  const [rawImageSrc, setRawImageSrc] = useState<string>('')
  const [processedFrameUrl, setProcessedFrameUrl] = useState<string>('')
  const [chromaEnabled, setChromaEnabled] = useState<boolean>(true)
  const [chromaColor, setChromaColor] = useState<string>('#00FF00')
  const [chromaTolerance, setChromaTolerance] = useState<number>(35)
  const [chromaSmoothness, setChromaSmoothness] = useState<number>(5)
  const [slotPadding, setSlotPadding] = useState<number>(15)
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
      }
    } finally {
      setIsProcessingChroma(false)
    }
  }, [])

  if (!isOpen) return null

  const activeSlots = customSlots.length > 0 ? customSlots : (
    preset === '3-vert' ? PRESET_3_VERTICAL : preset === '6-grid' ? PRESET_6_GRID : PRESET_4_VERTICAL
  )

  const previewConfig: TemplateConfig = {
    id: 'custom-' + Date.now(),
    name: name || 'Custom Strip Desain',
    description: description || 'Template strip kustom buatan kreator komunitas',
    photoCount: activeSlots.length,
    stripWidth: 600,
    stripHeight: 1800,
    backgroundColor: bgColor,
    accentColor: accentColor,
    textColor: '#0C1E14',
    frameImageUrl: processedFrameUrl || undefined,
    frameMode: 'overlay',
    slots: activeSlots,
    decorations: [
      { type: 'text', x: 300, y: 1680, text: (name || 'KUROBOOTH STRIP').toUpperCase(), fontSize: 16, fontFamily: 'Playfair Display, serif', color: accentColor, opacity: 0.95 },
      { type: 'text', x: 300, y: 1715, text: creatorName ? `BY ${creatorName.toUpperCase()}` : 'COMMUNITY EDITION', fontSize: 10, fontFamily: 'monospace', color: '#6B8574', opacity: 0.8 },
    ],
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    printSize: '2x6',
  }

  function handlePresetChange(p: '4-vert' | '3-vert' | '6-grid') {
    setPreset(p)
    if (p === '4-vert') setCustomSlots(PRESET_4_VERTICAL)
    if (p === '3-vert') setCustomSlots(PRESET_3_VERTICAL)
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
        reprocessChroma(base64, chromaColor, chromaTolerance, chromaSmoothness, chromaEnabled, slotPadding)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleEyeDropper() {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper()
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

  // Direct photo shoot with this custom template
  function handleStartShooting() {
    if (!name.trim()) {
      setErrorMsg('Silakan beri nama template terlebih dahulu.')
      return
    }
    onAddCustomTemplate?.(previewConfig)
    try {
      sessionStorage.setItem('kurobooth_template_' + previewConfig.id, JSON.stringify(previewConfig))
    } catch {}
    onClose()
    router.push(`/booth/${previewConfig.id}`)
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
      let finalFrameUrl = processedFrameUrl || rawImageSrc
      if (finalFrameUrl && finalFrameUrl.startsWith('data:')) {
        try {
          const { dataURLToBlob, generateShareCode } = await import('@/lib/utils')
          const blob = dataURLToBlob(finalFrameUrl)
          const frameCode = 'frame-user-' + generateShareCode()
          const formData = new FormData()
          formData.append('file', blob, frameCode + '.png')
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

      const payload = {
        name,
        creatorName: creatorName || 'Anonim',
        description,
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup modal">
          <CloseIcon size={18} />
        </button>

        <div className={styles.modalHeader}>
          <Mascot pose="artist" size="sm" animated={false} />
          <div>
            <h2 className={styles.headerTitle}>Sumbang &amp; Buat Template</h2>
            <p className={styles.headerSubtitle}>
              Kreasikan template photobooth Canva dengan Chroma Key penghapus warna otomatis dan deteksi lubang foto presisi.
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
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onClose}>
                <span>Kembali ke Beranda</span>
              </button>
              <button className="btn btn-secondary" onClick={handleStartShooting}>
                <span>Gunakan untuk Foto Sekarang</span>
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
                    className={`${styles.presetBtn} ${preset === '4-vert' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('4-vert')}
                  >
                    4 Foto Vertikal
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
                    className={`${styles.presetBtn} ${preset === '6-grid' ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetChange('6-grid')}
                  >
                    6 Foto Grid
                  </button>
                </div>
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
                    <span className={styles.chromaTitle}>Hapus Warna Kotak Foto (Chroma Key Transparan)</span>
                    <button
                      type="button"
                      className={styles.eyedropperBtn}
                      onClick={handleEyeDropper}
                    >
                      <EyedropperIcon size={14} />
                      <span>Pipet Warna (EyeDropper)</span>
                    </button>
                  </div>

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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={isSubmitting || isProcessingChroma}
                >
                  <SparklesIcon size={18} />
                  <span>{isSubmitting ? 'Mengirim Template...' : 'Sumbang ke Publik (Review Admin)'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={handleStartShooting}
                >
                  <span>Gunakan Langsung Saja untuk Foto</span>
                  <ArrowRightIcon size={15} />
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
