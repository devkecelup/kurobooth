'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  SettingsIcon,
  PaletteIcon,
  SparklesIcon,
  UploadIcon,
  PlusIcon,
  TrashIcon,
  ExternalLinkIcon,
  RefreshIcon,
  LockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  CloseIcon,
  EyedropperIcon,
  SearchIcon,
  CameraIcon,
  QrCodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/Icons'
import Mascot from '@/components/Mascot'
import TemplatePreview from '@/components/TemplatePreview'
import FloatingMascotAssistant from '@/components/FloatingMascotAssistant'
import { TemplateConfig } from '@/lib/templates'
import { getShareUrl } from '@/lib/utils'
import styles from './page.module.css'

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

const PRESET_3_VERTICAL: SlotDef[] = [
  { x: 40, y: 70, width: 520, height: 450, borderRadius: 12 },
  { x: 40, y: 560, width: 520, height: 450, borderRadius: 12 },
  { x: 40, y: 1050, width: 520, height: 450, borderRadius: 12 },
]

const PRESET_6_GRID: SlotDef[] = [
  { x: 40, y: 80, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 80, width: 245, height: 340, borderRadius: 6 },
  { x: 40, y: 460, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 460, width: 245, height: 340, borderRadius: 6 },
  { x: 40, y: 840, width: 245, height: 340, borderRadius: 6 },
  { x: 315, y: 840, width: 245, height: 340, borderRadius: 6 },
]

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

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

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

function detectTransparentSlots(imgData: ImageData, pad: number = 15): SlotDef[] {
  const { width, height, data } = imgData

  const isTransparent = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < 100) {
      isTransparent[i] = 1
    }
  }

  const visited = new Uint8Array(width * height)
  const minSlotArea = Math.floor(width * height * 0.01)
  const minSlotDimension = Math.floor(Math.min(width, height) * 0.08)

  const rawSlots: { xMin: number; xMax: number; yMin: number; yMax: number; area: number }[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!isTransparent[idx] || visited[idx]) continue

      let xMin = x
      let xMax = x
      let yMin = y
      let yMax = y
      let area = 0

      const queue = [idx]
      visited[idx] = 1
      let head = 0

      while (head < queue.length) {
        const curr = queue[head++]
        const cx = curr % width
        const cy = Math.floor(curr / width)
        area++

        if (cx < xMin) xMin = cx
        if (cx > xMax) xMax = cx
        if (cy < yMin) yMin = cy
        if (cy > yMax) yMax = cy

        const neighbors = [
          cy > 0 ? curr - width : -1,
          cy < height - 1 ? curr + width : -1,
          cx > 0 ? curr - 1 : -1,
          cx < width - 1 ? curr + 1 : -1,
        ]

        for (const n of neighbors) {
          if (n >= 0 && isTransparent[n] && !visited[n]) {
            visited[n] = 1
            queue.push(n)
          }
        }
      }

      const w = xMax - xMin + 1
      const h = yMax - yMin + 1

      if (area >= minSlotArea && w >= minSlotDimension && h >= minSlotDimension) {
        rawSlots.push({ xMin, xMax, yMin, yMax, area })
      }
    }
  }

  if (rawSlots.length === 0) return []

  rawSlots.sort((a, b) => {
    const yDiff = a.yMin - b.yMin
    if (Math.abs(yDiff) > 50) return yDiff
    return a.xMin - b.xMin
  })

  return rawSlots.map(slot => {
    const slotX = Math.max(0, slot.xMin - pad)
    const slotY = Math.max(0, slot.yMin - pad)
    const slotW = Math.min(width - slotX, (slot.xMax - slot.xMin) + pad * 2)
    const slotH = Math.min(height - slotY, (slot.yMax - slot.yMin) + pad * 2)

    return {
      x: slotX,
      y: slotY,
      width: slotW,
      height: slotH,
      borderRadius: 16,
    }
  })
}

// Process Image Chroma Key with dynamic aspect ratio preservation
async function applyChromaKey(
  imageSrc: string,
  chromaHex: string,
  tolerance: number = 20,
  smoothness: number = 5,
  slotPadding: number = 15,
  despeckle: number = 600
): Promise<{ dataUrl: string; detectedSlots: SlotDef[]; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const naturalW = img.naturalWidth || 600
      const naturalH = img.naturalHeight || 1800
      const ratio = naturalW / naturalH
      const baseHeight = 1800
      const calculatedWidth = Math.round(baseHeight * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = calculatedWidth
      canvas.height = baseHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve({ dataUrl: imageSrc, detectedSlots: [], width: calculatedWidth, height: baseHeight })

      ctx.drawImage(img, 0, 0, calculatedWidth, baseHeight)
      const imgData = ctx.getImageData(0, 0, calculatedWidth, baseHeight)
      const data = imgData.data
      const { width, height } = imgData

      const target = hexToRgb(chromaHex)
      const targetHsv = rgbToHsv(target.r, target.g, target.b)
      const isTargetSaturated = targetHsv.s > 25

      const tolDist = (tolerance / 100) * 380
      const smoothRange = (smoothness / 100) * 80

      function colorDist(r: number, g: number, b: number): number {
        if (isTargetSaturated) {
          const pixHsv = rgbToHsv(r, g, b)
          let hueDiff = Math.abs(pixHsv.h - targetHsv.h)
          if (hueDiff > 180) hueDiff = 360 - hueDiff
          const satDiff = Math.abs(pixHsv.s - targetHsv.s)
          const valDiff = Math.abs(pixHsv.v - targetHsv.v)
          return (hueDiff / 180) * 280 + (satDiff / 100) * 60 + (valDiff / 100) * 40
        } else {
          return Math.sqrt((r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2)
        }
      }

      // Phase 1: flood-fill dari tepi — threshold ketat untuk seed
      const inRegion = new Uint8Array(width * height)
      const queue: number[] = []

      const seedThreshold = tolDist * 0.6

      function enqueueEdge(px: number) {
        if (inRegion[px]) return
        const i = px * 4
        if (data[i + 3] < 200) { inRegion[px] = 2; return }
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        inRegion[px] = dist <= seedThreshold ? 1 : 2
        if (inRegion[px] === 1) queue.push(px)
      }

      function enqueueNeighbor(px: number) {
        if (inRegion[px]) return
        const i = px * 4
        if (data[i + 3] < 200) { inRegion[px] = 2; return }
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        inRegion[px] = dist <= tolDist + smoothRange ? 1 : 2
        if (inRegion[px] === 1) queue.push(px)
      }

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
          cy > 0          ? px - width    : -1,
          cy < height - 1 ? px + width    : -1,
          cx > 0          ? px - 1        : -1,
          cx < width - 1  ? px + 1        : -1,
        ]
        for (const n of neighbors) { if (n >= 0) enqueueNeighbor(n) }
      }

      // Phase 2: interior enclosed chroma pockets (photo slots)
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          const px = y * width + x
          if (inRegion[px]) continue
          const i = px * 4
          if (colorDist(data[i], data[i + 1], data[i + 2]) > tolDist) continue
          const pocketQueue = [px]
          inRegion[px] = 1
          let pHead = 0
          while (pHead < pocketQueue.length) {
            const ppx = pocketQueue[pHead++]
            const pcx = ppx % width
            const pcy = Math.floor(ppx / width)
            const pn = [
              pcy > 0          ? ppx - width    : -1,
              pcy < height - 1 ? ppx + width    : -1,
              pcx > 0          ? ppx - 1        : -1,
              pcx < width - 1  ? ppx + 1        : -1,
            ]
            for (const n of pn) {
              if (n >= 0 && !inRegion[n]) {
                const ni = n * 4
                if (colorDist(data[ni], data[ni + 1], data[ni + 2]) <= tolDist + smoothRange) {
                  inRegion[n] = 1
                  pocketQueue.push(n)
                }
              }
            }
          }
        }
      }

      // Phase 3: apply transparency
      for (let px = 0; px < width * height; px++) {
        if (inRegion[px] !== 1) continue
        const i = px * 4
        const dist = colorDist(data[i], data[i + 1], data[i + 2])
        if (dist <= tolDist) {
          data[i + 3] = 0
        } else if (smoothRange > 0 && dist < tolDist + smoothRange) {
          const ratio = (dist - tolDist) / smoothRange
          data[i + 3] = Math.min(data[i + 3], Math.round(255 * ratio * ratio))
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
        width: calculatedWidth,
        height: baseHeight,
      })
    }
    img.onerror = () => resolve({ dataUrl: imageSrc, detectedSlots: [], width: 600, height: 1800 })
    img.src = imageSrc
  })
}

interface AdminSession {
  id?: string
  share_code?: string
  template_id?: string
  image_url?: string
  created_at?: string
}

interface SlotDef {
  x: number
  y: number
  width: number
  height: number
  borderRadius?: number
}

export default function AdminPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'sessions' | 'upload'>('overview')

  // Data State
  const [templates, setTemplates] = useState<TemplateConfig[]>([])
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionsLoading, setIsSessionsLoading] = useState(false)

  // Template Search & Filter State
  const [templateFilter, setTemplateFilter] = useState<'all' | 'active' | 'pending' | 'default' | 'community'>('all')
  const [templateSearch, setTemplateSearch] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Session Search State
  const [sessionSearch, setSessionSearch] = useState('')
  const [previewLightboxImg, setPreviewLightboxImg] = useState<string | null>(null)

  // Pagination State for Templates & Sessions
  const [templatePage, setTemplatePage] = useState(1)
  const TEMPLATES_PER_PAGE = 8
  const [sessionPage, setSessionPage] = useState(1)
  const SESSIONS_PER_PAGE = 9

  useEffect(() => {
    setTemplatePage(1)
  }, [templateFilter, templateSearch])

  useEffect(() => {
    setSessionPage(1)
  }, [sessionSearch])

  // Actions Loading State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  // Form State for Canva Template Creation
  const [formFrameDimensions, setFormFrameDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 1800 })
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPreset, setFormPreset] = useState<'2-vert' | '3-vert' | '4-vert' | '6-grid'>('4-vert')
  const [formSlots, setFormSlots] = useState<SlotDef[]>(PRESET_4_VERTICAL)
  const [formBgColor, setFormBgColor] = useState('#FFFFFF')
  const [formAccentColor, setFormAccentColor] = useState('#0D3B24')
  const [formTags, setFormTags] = useState('canva, strip')
  const [rawImageSrc, setRawImageSrc] = useState('')
  const [processedFrameUrl, setProcessedFrameUrl] = useState('')
  const [chromaColor, setChromaColor] = useState('#00FF00')
  const [chromaTolerance, setChromaTolerance] = useState(20)
  const [chromaSmoothness] = useState(5)
  const [slotPadding, setSlotPadding] = useState(15)
  const [detectedSlotCount, setDetectedSlotCount] = useState(0)
  const [isProcessingChroma, setIsProcessingChroma] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [formError, setFormError] = useState('')

  // Interactive Mascot Modal Alert & Confirm State
  const [mascotModal, setMascotModal] = useState<{
    isOpen: boolean
    type?: 'success' | 'confirm' | 'danger'
    title: string
    message: string
    pose: 'waving' | 'camera' | 'sparkle' | 'artist' | 'searching' | 'happy' | 'lost'
    speechText?: string
    confirmText?: string
    cancelText?: string
    onConfirm?: () => void
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    pose: 'happy',
  })

  const reprocessChroma = useCallback(async (
    src: string,
    color: string,
    tol: number,
    smooth: number,
    pad: number = 15
  ) => {
    if (!src) return
    setIsProcessingChroma(true)
    try {
      const result = await applyChromaKey(src, color, tol, smooth, pad, 1200)
      setProcessedFrameUrl(result.dataUrl)
      if (result.width && result.height) {
        setFormFrameDimensions({ width: result.width, height: result.height })
      }
      if (result.detectedSlots && result.detectedSlots.length > 0) {
        setFormSlots(result.detectedSlots)
        setDetectedSlotCount(result.detectedSlots.length)
        if (result.detectedSlots.length === 2) setFormPreset('2-vert')
        else if (result.detectedSlots.length === 3) setFormPreset('3-vert')
        else if (result.detectedSlots.length === 4) setFormPreset('4-vert')
        else if (result.detectedSlots.length >= 6) setFormPreset('6-grid')
      }
    } finally {
      setIsProcessingChroma(false)
    }
  }, [])

  const loadTemplates = useCallback(async (adminSecret: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/templates?all=true', {
        headers: { 'x-admin-secret': adminSecret },
      })
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadSessions = useCallback(async (adminSecret: string) => {
    setIsSessionsLoading(true)
    try {
      const res = await fetch('/api/admin/sessions?secret=' + encodeURIComponent(adminSecret))
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
      }
    } catch (e) {
      console.warn('Failed to load admin sessions:', e)
    } finally {
      setIsSessionsLoading(false)
    }
  }, [])

  // Auto-restore admin session from sessionStorage, but verify against server first
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const savedSecret = sessionStorage.getItem('kurobooth_admin_secret')
        if (!savedSecret) return
        // Re-verify — session storage bisa jadi stale kalau password sudah ganti
        const verifyRes = await fetch('/api/admin/sessions?secret=' + encodeURIComponent(savedSecret))
        if (!verifyRes.ok) {
          // Password sudah tidak valid — hapus dari storage
          sessionStorage.removeItem('kurobooth_admin_secret')
          return
        }
        setSecret(savedSecret)
        setIsLoggedIn(true)
        const data = await verifyRes.json()
        setSessions(data.sessions ?? [])
        loadTemplates(savedSecret)
      } catch {}
    }, 0)
    return () => clearTimeout(timer)
  }, [loadTemplates])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) {
      setLoginError('Silakan masukkan kata sandi admin.')
      return
    }
    setLoginError('')
    setIsLoading(true)
    try {
      // Verifikasi ke server dulu — jika secret salah, server akan return 401/403
      const verifyRes = await fetch('/api/admin/sessions?secret=' + encodeURIComponent(secret))
      if (!verifyRes.ok) {
        setLoginError('Kata sandi salah. Akses ditolak.')
        return
      }
      // Password benar → izinkan masuk
      setIsLoggedIn(true)
      try {
        sessionStorage.setItem('kurobooth_admin_secret', secret)
      } catch {}
      const data = await verifyRes.json()
      setSessions(data.sessions ?? [])
      loadTemplates(secret)
    } catch {
      setLoginError('Gagal terhubung ke server. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem('kurobooth_admin_secret')
    } catch {}
    setIsLoggedIn(false)
    setSecret('')
  }

  // Approve pending template
  async function handleApprove(id: string, name?: string) {
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}&action=approve`, {
        method: 'PATCH',
        headers: { 'x-admin-secret': secret },
      })
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: true } : t))
        loadTemplates(secret)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kurobooth:templates-updated'))
        }
        setMascotModal({
          isOpen: true,
          type: 'success',
          title: 'Template Berhasil Disetujui! 🎉',
          message: `Template "${name || 'Komunitas'}" sekarang resmi aktif dan sudah tampil di galeri publik untuk seluruh pengunjung!`,
          pose: 'sparkle',
          speechText: 'Hore! Template keren ini resmi tayang! ✨',
          confirmText: 'Mantap!',
        })
      }
    } catch (e) {
      console.error('Approve error:', e)
    }
  }

  // Reject / Delete template with Mascot Confirm Dialog
  function handleDelete(id: string, isReject: boolean = false, name?: string) {
    setMascotModal({
      isOpen: true,
      type: 'danger',
      title: isReject ? 'Tolak Template Komunitas?' : 'Hapus Template?',
      message: isReject
        ? `Apakah kamu yakin ingin menolak & menghapus template "${name || 'ini'}"? Template tidak akan diterbitkan ke publik.`
        : `Apakah kamu yakin ingin menghapus template "${name || 'ini'}" secara permanen dari sistem?`,
      pose: isReject ? 'artist' : 'lost',
      speechText: isReject ? 'Yakin mau tolak template ini? 🤔' : 'Aksi ini tidak bisa dibatalkan yaa! ⚠️',
      confirmText: isReject ? 'Ya, Tolak Template' : 'Ya, Hapus Template',
      cancelText: 'Batal',
      onConfirm: async () => {
        setDeleteId(id)
        try {
          const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'x-admin-secret': secret },
          })
          if (res.ok) {
            setTemplates(prev => prev.filter(t => t.id !== id))
            loadTemplates(secret)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kurobooth:templates-updated'))
            }
          }
        } catch (e) {
          console.error('Delete template error:', e)
        } finally {
          setDeleteId(null)
        }
      },
    })
  }

  // Delete session with Mascot Confirm Dialog
  function handleDeleteSession(shareCode: string) {
    setMascotModal({
      isOpen: true,
      type: 'danger',
      title: 'Hapus Riwayat Sesi Foto?',
      message: `Riwayat foto dengan share code #${shareCode} akan dihapus permanen dari sistem beserta file fotonya.`,
      pose: 'camera',
      speechText: 'Foto sesi ini akan dihapus permanen! 📸',
      confirmText: 'Ya, Hapus Sesi',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/sessions?shareCode=${encodeURIComponent(shareCode)}&secret=${encodeURIComponent(secret)}`, {
            method: 'DELETE',
          })
          if (res.ok) {
            setSessions(prev => prev.filter(s => s.share_code !== shareCode))
          }
        } catch (e) {
          console.error('Delete session error:', e)
        }
      },
    })
  }

  function handlePresetChange(p: '2-vert' | '3-vert' | '4-vert' | '6-grid') {
    setFormPreset(p)
    const W = formFrameDimensions.width
    const H = formFrameDimensions.height
    const isDouble = W / H > 0.5

    if (isDouble) {
      const colW = Math.floor((W - 120) / 2)
      const col1X = 40
      const col2X = W - colW - 40
      if (p === '6-grid' || p === '3-vert') {
        const rowH = Math.floor((H - 240) / 3)
        setFormSlots([
          { x: col1X, y: 70, width: colW, height: rowH, borderRadius: 12 },
          { x: col2X, y: 70, width: colW, height: rowH, borderRadius: 12 },
          { x: col1X, y: 70 + rowH + 40, width: colW, height: rowH, borderRadius: 12 },
          { x: col2X, y: 70 + rowH + 40, width: colW, height: rowH, borderRadius: 12 },
          { x: col1X, y: 70 + (rowH + 40) * 2, width: colW, height: rowH, borderRadius: 12 },
          { x: col2X, y: 70 + (rowH + 40) * 2, width: colW, height: rowH, borderRadius: 12 },
        ])
      } else if (p === '2-vert') {
        const rowH = Math.floor((H - 220) / 2)
        setFormSlots([
          { x: col1X, y: 80, width: colW, height: rowH, borderRadius: 14 },
          { x: col2X, y: 80, width: colW, height: rowH, borderRadius: 14 },
          { x: col1X, y: 80 + rowH + 50, width: colW, height: rowH, borderRadius: 14 },
          { x: col2X, y: 80 + rowH + 50, width: colW, height: rowH, borderRadius: 14 },
        ])
      } else {
        const rowH = Math.floor((H - 300) / 4)
        setFormSlots([
          { x: col1X, y: 60, width: colW, height: rowH, borderRadius: 8 },
          { x: col2X, y: 60, width: colW, height: rowH, borderRadius: 8 },
          { x: col1X, y: 60 + rowH + 30, width: colW, height: rowH, borderRadius: 8 },
          { x: col2X, y: 60 + rowH + 30, width: colW, height: rowH, borderRadius: 8 },
        ])
      }
    } else {
      if (p === '2-vert') setFormSlots(PRESET_2_VERTICAL)
      if (p === '3-vert') setFormSlots(PRESET_3_VERTICAL)
      if (p === '4-vert') setFormSlots(PRESET_4_VERTICAL)
      if (p === '6-grid') setFormSlots(PRESET_6_GRID)
    }
    setDetectedSlotCount(0)
  }

  // Chroma key image handlers for creator
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string
        setRawImageSrc(base64)
        setProcessedFrameUrl('')

        // Auto-detect aspect ratio & transparency
        const img = new Image()
        img.onload = () => {
          const naturalW = img.naturalWidth || 600
          const naturalH = img.naturalHeight || 1800
          const ratio = naturalW / naturalH
          const baseHeight = 1800
          const calculatedWidth = Math.round(baseHeight * ratio)

          setFormFrameDimensions({ width: calculatedWidth, height: baseHeight })

          const c = document.createElement('canvas')
          c.width = calculatedWidth
          c.height = baseHeight
          const cx = c.getContext('2d')
          if (!cx) return
          cx.drawImage(img, 0, 0, calculatedWidth, baseHeight)
          const { data } = cx.getImageData(0, 0, c.width, c.height)
          let transparentCount = 0
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 200) transparentCount++
          }
          const transparentRatio = transparentCount / (c.width * c.height)
          if (transparentRatio > 0.05) {
            // Gambar sudah transparan — bypass chroma
            setProcessedFrameUrl(base64)
            // Lakukan deteksi slot 2D otomatis
            const imgData = cx.getImageData(0, 0, c.width, c.height)
            const detected = detectTransparentSlots(imgData, slotPadding)
            if (detected && detected.length > 0) {
              setFormSlots(detected)
              setDetectedSlotCount(detected.length)
              if (detected.length === 2) setFormPreset('2-vert')
              else if (detected.length === 3) setFormPreset('3-vert')
              else if (detected.length === 4) setFormPreset('4-vert')
              else if (detected.length >= 6) setFormPreset('6-grid')
            }
          } else {
            reprocessChroma(base64, chromaColor, chromaTolerance, chromaSmoothness, slotPadding)
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
          reprocessChroma(rawImageSrc, color, chromaTolerance, chromaSmoothness, slotPadding)
        }
      } catch {}
    } else {
      alert('Klik langsung pada kotak foto di gambar Canva di bawah untuk mengambil warnanya!')
    }
  }

  function handleImageCanvasClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * (img.naturalWidth || formFrameDimensions.width))
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * (img.naturalHeight || formFrameDimensions.height))

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || formFrameDimensions.width
    canvas.height = img.naturalHeight || formFrameDimensions.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2])

    setChromaColor(hex)
    reprocessChroma(rawImageSrc, hex, chromaTolerance, chromaSmoothness, slotPadding)
  }

  async function handleSaveAdminTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) {
      setFormError('Nama template wajib diisi.')
      return
    }

    setIsSavingTemplate(true)
    setFormError('')

    try {
      let finalFrameUrl = processedFrameUrl || rawImageSrc
      if (finalFrameUrl && finalFrameUrl.startsWith('data:')) {
        try {
          const { generateShareCode } = await import('@/lib/utils')
          const webpDataUrl = await convertToWebP(finalFrameUrl, 0.92)
          const frameCode = 'frame-admin-' + generateShareCode()
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

      const isDoubleOrWide = formFrameDimensions.width / formFrameDimensions.height > 0.5

      const payload = {
        id: editingTemplateId || undefined,
        name: formName,
        description: formDesc.trim() || 'Template kustom dari Canva',
        photoCount: formSlots.length,
        stripWidth: formFrameDimensions.width,
        stripHeight: formFrameDimensions.height,
        backgroundColor: formBgColor,
        accentColor: formAccentColor,
        textColor: '#0C1E14',
        frameImageUrl: finalFrameUrl || undefined,
        frameMode: 'overlay',
        slots: formSlots,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        printSize: isDoubleOrWide ? '4x6' : '2x6',
      }

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        const isEdit = Boolean(editingTemplateId)
        const savedName = formName
        setEditingTemplateId(null)
        setFormName('')
        setFormDesc('')
        setRawImageSrc('')
        setProcessedFrameUrl('')
        setFormSlots(PRESET_4_VERTICAL)
        setFormFrameDimensions({ width: 600, height: 1800 })
        loadTemplates(secret)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kurobooth:templates-updated'))
        }
        setActiveTab('templates')
        setMascotModal({
          isOpen: true,
          type: 'success',
          title: isEdit ? 'Template Berhasil Diperbarui! ✏️' : 'Template Berhasil Diterbitkan! 🎉',
          message: isEdit
            ? `Perubahan pada template "${savedName}" berhasil disimpan dan langsung aktif di galeri.`
            : `Template "${savedName}" berhasil dibuat dan sekarang sudah langsung bisa digunakan oleh pengunjung!`,
          pose: 'sparkle',
          speechText: isEdit ? 'Update template berhasil disimpan! 🌟' : 'Template baru langsung tayang! 🎨',
          confirmText: 'Lihat Daftar Template',
        })
      } else {
        setFormError(data.error || 'Gagal menyimpan template.')
      }
    } catch {
      setFormError('Terjadi kesalahan koneksi saat menyimpan template.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Edit an existing template in the editor
  function handleStartEdit(t: TemplateConfig) {
    setEditingTemplateId(t.id)
    setFormName(t.name)
    setFormDesc(t.description || '')
    setFormBgColor(t.backgroundColor || '#FFFFFF')
    setFormAccentColor(t.accentColor || '#0D3B24')
    setFormTags((t.tags || []).join(', '))
    setFormSlots(t.slots || PRESET_4_VERTICAL)
    setFormFrameDimensions({ width: t.stripWidth || 600, height: t.stripHeight || 1800 })
    setRawImageSrc(t.frameImageUrl || '')
    setProcessedFrameUrl(t.frameImageUrl || '')
    setFormPreset(t.slots.length === 2 ? '2-vert' : t.slots.length === 3 ? '3-vert' : t.slots.length === 6 ? '6-grid' : '4-vert')
    setFormError('')
    setActiveTab('upload')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingTemplateId(null)
    setFormName('')
    setFormDesc('')
    setFormBgColor('#FFFFFF')
    setFormAccentColor('#0D3B24')
    setFormTags('canva, strip')
    setFormSlots(PRESET_4_VERTICAL)
    setFormFrameDimensions({ width: 600, height: 1800 })
    setRawImageSrc('')
    setProcessedFrameUrl('')
    setFormPreset('4-vert')
    setFormError('')
  }

  // Helper to distinguish built-in vs community uploaded templates
  const isDefaultTemplate = (id: string) => (
    id.startsWith('kuro-') || id.startsWith('korean-') || id.startsWith('vintage-') || 
    id.startsWith('cherry-') || id.startsWith('minimalist-') || id.startsWith('tokyo-') || 
    id.startsWith('aesthetic-') || id.startsWith('polaroid-') || id.startsWith('emerald-') || 
    id.startsWith('y2k-') || id.startsWith('tb-')
  )

  // Filtered Templates
  const activeTemplates = templates.filter(t => t.isActive !== false)
  const pendingTemplates = templates.filter(t => t.isActive === false)
  const defaultTemplates = templates.filter(t => isDefaultTemplate(t.id))
  const communityTemplates = templates.filter(t => !isDefaultTemplate(t.id))

  const displayedTemplates = templates.filter(t => {
    if (templateFilter === 'active' && t.isActive === false) return false
    if (templateFilter === 'pending' && t.isActive !== false) return false
    if (templateFilter === 'default' && !isDefaultTemplate(t.id)) return false
    if (templateFilter === 'community' && isDefaultTemplate(t.id)) return false
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase()
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      )
    }
    return true
  })

  // Filtered Sessions by Share Code or ID
  const displayedSessions = sessions.filter(s => {
    if (!sessionSearch.trim()) return true
    const q = sessionSearch.toLowerCase().trim()
    const code = (s.share_code || '').toLowerCase()
    const id = (s.id || '').toLowerCase()
    const tId = (s.template_id || '').toLowerCase()
    return code.includes(q) || id.includes(q) || tId.includes(q)
  })

  // Pagination Calculations
  const totalTemplatePages = Math.ceil(displayedTemplates.length / TEMPLATES_PER_PAGE) || 1
  const paginatedTemplates = displayedTemplates.slice((templatePage - 1) * TEMPLATES_PER_PAGE, templatePage * TEMPLATES_PER_PAGE)

  const totalSessionPages = Math.ceil(displayedSessions.length / SESSIONS_PER_PAGE) || 1
  const paginatedSessions = displayedSessions.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE)

  if (!isLoggedIn) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <LockIcon size={28} />
          </div>
          <h1 className={styles.loginTitle}>Admin Studio Portal</h1>
          <p className={styles.loginSubtitle}>
            Masukkan kata sandi admin untuk mengelola template, kurasi kiriman komunitas, dan riwayat foto sesi.
          </p>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              id="admin-secret-input"
              type="password"
              className={styles.input}
              placeholder="Masukkan Admin Secret..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoFocus
            />
            {loginError && (
              <div className={styles.formError}>
                <AlertCircleIcon size={16} />
                <span>{loginError}</span>
              </div>
            )}
            <button id="btn-login" type="submit" className="btn btn-primary w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Dashboard</span>
              )}
            </button>
          </form>

          <button className={`btn btn-ghost btn-sm ${styles.backBtn}`} onClick={() => router.push('/')}>
            <ArrowLeftIcon size={14} />
            <span>Kembali ke Galeri Publik</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarBrand}>
            <Mascot pose="happy" size={38} animated={false} />
            <div className={styles.brandTextWrap}>
              <span className={styles.brandTitle}>KuroBooth Studio</span>
              <span className={styles.brandBadge}>Admin Management</span>
            </div>
          </div>

          <div className={styles.adminStatusPill}>
            <span className={styles.onlineDot} />
            <span>Administrator Online</span>
          </div>

          <nav className={styles.sidebarNav}>
            <button
              className={`${styles.navItem} ${activeTab === 'overview' ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <div className={styles.navItemLeft}>
                <SettingsIcon size={18} />
                <span>Overview &amp; Stats</span>
              </div>
            </button>

            <button
              className={`${styles.navItem} ${activeTab === 'templates' ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <div className={styles.navItemLeft}>
                <PaletteIcon size={18} />
                <span>Kelola Template</span>
              </div>
              <span className={`${styles.navBadge} ${pendingTemplates.length > 0 ? styles.navBadgeWarning : ''}`}>
                {pendingTemplates.length > 0 ? `${pendingTemplates.length} Pending` : templates.length}
              </span>
            </button>

            <button
              className={`${styles.navItem} ${activeTab === 'sessions' ? styles.navItemActive : ''}`}
              onClick={() => { setActiveTab('sessions'); loadSessions(secret) }}
            >
              <div className={styles.navItemLeft}>
                <SparklesIcon size={18} />
                <span>Riwayat Sesi Foto</span>
              </div>
              <span className={styles.navBadge}>{sessions.length}</span>
            </button>

            <button
              className={`${styles.navItem} ${activeTab === 'upload' ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <div className={styles.navItemLeft}>
                <UploadIcon size={18} />
                <span>Upload Frame Canva</span>
              </div>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <button className="btn btn-ghost btn-sm w-full" onClick={() => router.push('/')} style={{ justifyContent: 'flex-start' }}>
            <ArrowLeftIcon size={16} />
            <span>Ke Galeri Publik</span>
          </button>
          <button className="btn btn-ghost btn-sm w-full" onClick={handleLogout} style={{ justifyContent: 'flex-start', color: '#DC2626' }}>
            <LockIcon size={16} />
            <span>Keluar / Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Global Toast Success Notification */}
        {actionSuccessMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#E4F2E8', border: '1.5px solid #10B981', color: '#065F46', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontWeight: 600 }}>
            <CheckCircleIcon size={20} />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <section>
            <div className={styles.topBar}>
              <div className={styles.pageHeading}>
                <h1 className={styles.pageTitle}>Dashboard Overview</h1>
                <p className={styles.pageSubtitle}>Pantau kinerja studio photobooth, kurasi template komunitas, dan data hasil foto.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { loadTemplates(secret); loadSessions(secret) }}>
                <RefreshIcon size={14} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Stat Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconWrapGreen}`}>
                  <PaletteIcon size={24} />
                </div>
                <div>
                  <div className={styles.statVal}>{activeTemplates.length}</div>
                  <div className={styles.statLabel}>Template Aktif Publik</div>
                </div>
              </div>

              <div className={styles.statCard} style={pendingTemplates.length > 0 ? { border: '2px solid #F59E0B', background: '#FFFBEB' } : undefined}>
                <div className={`${styles.statIconWrap} ${styles.statIconWrapAmber}`}>
                  <AlertCircleIcon size={24} />
                </div>
                <div>
                  <div className={styles.statVal}>{pendingTemplates.length}</div>
                  <div className={styles.statLabel}>Menunggu Persetujuan</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconWrapBlue}`}>
                  <CameraIcon size={24} />
                </div>
                <div>
                  <div className={styles.statVal}>{sessions.length}</div>
                  <div className={styles.statLabel}>Total Riwayat Foto Sesi</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconWrapPurple}`}>
                  <QrCodeIcon size={24} />
                </div>
                <div>
                  <div className={styles.statVal}>Cloud Ready</div>
                  <div className={styles.statLabel}>Supabase &amp; Catbox CDN</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                <PlusIcon size={16} />
                <span>+ Upload Template Canva Baru</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('templates')}>
                <PaletteIcon size={16} />
                <span>Kelola Semua Template ({templates.length})</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('sessions')}>
                <SearchIcon size={16} />
                <span>Cari Riwayat Foto Sesi ({sessions.length})</span>
              </button>
            </div>

            {/* PENDING REVIEW DIRECT QUEUE */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0D3B24' }}>
                    Antrean Template Menunggu Persetujuan ({pendingTemplates.length})
                  </h2>
                  {pendingTemplates.length > 0 && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '999px', border: '1px solid #FCD34D' }}>
                      🟡 Perlu Tindakan
                    </span>
                  )}
                </div>
                {pendingTemplates.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setActiveTab('templates'); setTemplateFilter('pending') }}
                    style={{ fontSize: '0.8125rem', color: 'var(--accent-1)' }}
                  >
                    <span>Buka Filter di Tab Template &rarr;</span>
                  </button>
                )}
              </div>

              {pendingTemplates.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid var(--border)',
                  borderRadius: '16px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Mascot pose="happy" size={44} animated={false} />
                  <p style={{ fontWeight: 700, color: '#0D3B24', fontSize: '0.9375rem' }}>
                    Semua Bersih! Tidak Ada Template Pending ✨
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
                    Semua template sumbangan komunitas sudah disetujui atau belum ada kiriman baru.
                  </p>
                </div>
              ) : (
                <div className={styles.templateGridList}>
                  {pendingTemplates.map(t => (
                    <div
                      key={t.id}
                      className={styles.templateCard}
                      style={{ border: '2px solid #F59E0B', background: '#FFFDF7' }}
                    >
                      <div className={styles.cardPreviewWrap}>
                        <TemplatePreview template={t} />
                      </div>
                      <div className={styles.cardInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div className={styles.cardName}>{t.name}</div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '999px', border: '1px solid #FCD34D' }}>
                            🟡 Pending
                          </span>
                        </div>
                        <div className={styles.cardMeta}>
                          <span className={styles.cardMetaBadge}>{t.photoCount} foto</span>
                          <span>·</span>
                          <span>{t.printSize}</span>
                        </div>
                        {t.description && <div className={styles.cardDesc}>{t.description}</div>}
                        <div className={styles.cardTags}>
                          {t.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className={styles.cardTag}>#{tag}</span>
                          ))}
                        </div>

                        <div className={styles.cardActions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(t.id, t.name)}
                            style={{ flex: 1, background: '#10B981', borderColor: '#059669' }}
                          >
                            <CheckCircleIcon size={14} />
                            <span>Setujui</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStartEdit(t)}
                            title="Edit template sebelum disetujui"
                          >
                            <PaletteIcon size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(t.id, true, t.name)}
                            disabled={deleteId === t.id}
                            title="Tolak dan Hapus Template"
                          >
                            <CloseIcon size={14} />
                            <span>{deleteId === t.id ? '...' : 'Tolak'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: KELOLA TEMPLATE */}
        {activeTab === 'templates' && (
          <section>
            <div className={styles.topBar}>
              <div className={styles.pageHeading}>
                <h1 className={styles.pageTitle}>Kelola Template Studio ({displayedTemplates.length})</h1>
                <p className={styles.pageSubtitle}>Setujui kiriman komunitas, kelola desain template aktif, atau hapus template.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('upload')}>
                <PlusIcon size={14} />
                <span>+ Upload Frame Canva</span>
              </button>
            </div>

            {/* Filters & Search */}
            <div className={styles.filterBar}>
              <div className={styles.subTabs}>
                <button
                  className={`${styles.subTabBtn} ${templateFilter === 'all' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setTemplateFilter('all')}
                >
                  Semua ({templates.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${templateFilter === 'active' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setTemplateFilter('active')}
                >
                  Aktif ({activeTemplates.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${templateFilter === 'pending' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setTemplateFilter('pending')}
                >
                  Pending ({pendingTemplates.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${templateFilter === 'default' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setTemplateFilter('default')}
                >
                  Bawaan / Default ({defaultTemplates.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${templateFilter === 'community' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setTemplateFilter('community')}
                >
                  Komunitas ({communityTemplates.length})
                </button>
              </div>

              <div className={styles.searchBox}>
                <SearchIcon size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Cari nama template, kreator, tag..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
                {templateSearch && (
                  <button onClick={() => setTemplateSearch('')} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <span>Memuat data template...</span>
              </div>
            ) : displayedTemplates.length === 0 ? (
              <div className={styles.emptyState}>
                <Mascot pose="searching" size="md" animated={false} />
                <p style={{ marginTop: 12, fontWeight: 600 }}>Tidak ada template yang cocok dengan filter atau pencarian Anda.</p>
              </div>
            ) : (
              <>
                <div className={styles.templateGridList}>
                  {paginatedTemplates.map(t => (
                    <div
                      key={t.id}
                      className={styles.templateCard}
                      style={t.isActive === false ? { border: '2px solid #F59E0B', background: '#FFFDF7' } : undefined}
                    >
                      <div className={styles.cardPreviewWrap}>
                        <TemplatePreview template={t} />
                      </div>
                      <div className={styles.cardInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div className={styles.cardName}>{t.name}</div>
                          {t.isActive === false ? (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '999px', border: '1px solid #FCD34D' }}>
                              🟡 Pending
                            </span>
                          ) : isDefaultTemplate(t.id) ? (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '999px', border: '1px solid #BAE6FD' }}>
                              🌟 Default
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#E4F2E8', color: '#0D3B24', padding: '2px 8px', borderRadius: '999px', border: '1px solid #B8DCBF' }}>
                              🎨 Komunitas
                            </span>
                          )}
                        </div>
                        <div className={styles.cardMeta}>
                          <span className={styles.cardMetaBadge}>{t.photoCount} foto</span>
                          <span>·</span>
                          <span>{t.printSize}</span>
                        </div>
                        {t.description && <div className={styles.cardDesc}>{t.description}</div>}
                        <div className={styles.cardTags}>
                          {t.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className={styles.cardTag}>#{tag}</span>
                          ))}
                        </div>

                        <div className={styles.cardActions}>
                          {t.isActive === false ? (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApprove(t.id, t.name)}
                                style={{ flex: 1, background: '#10B981', borderColor: '#059669' }}
                              >
                                <CheckCircleIcon size={14} />
                                <span>Setujui</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartEdit(t)}
                                title="Edit template sebelum disetujui"
                              >
                                <PaletteIcon size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(t.id, true, t.name)}
                                disabled={deleteId === t.id}
                                title="Tolak dan Hapus Template"
                              >
                                <CloseIcon size={14} />
                                <span>{deleteId === t.id ? '...' : 'Tolak'}</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartEdit(t)}
                                style={{ flex: 1 }}
                                title="Edit template ini"
                              >
                                <PaletteIcon size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => window.open('/booth/' + t.id, '_blank')}
                              >
                                <ExternalLinkIcon size={14} />
                                <span>Buka</span>
                              </button>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(t.id, false, t.name)}
                                disabled={deleteId === t.id}
                                title="Hapus template"
                              >
                                <TrashIcon size={14} />
                                <span>{deleteId === t.id ? '...' : 'Hapus'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls for Templates */}
                {displayedTemplates.length > TEMPLATES_PER_PAGE && (
                  <div className={styles.paginationWrap}>
                    <div className={styles.paginationControls}>
                      <button
                        type="button"
                        className={styles.paginationNavBtn}
                        onClick={() => { setTemplatePage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={templatePage === 1}
                      >
                        <ChevronLeftIcon size={16} />
                        <span>Sebelumnya</span>
                      </button>

                      <div className={styles.pageNumbers}>
                        {Array.from({ length: totalTemplatePages }, (_, idx) => idx + 1).map(page => (
                          <button
                            key={page}
                            type="button"
                            className={`${styles.pageNumberBtn} ${templatePage === page ? styles.pageNumberBtnActive : ''}`}
                            onClick={() => { setTemplatePage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={styles.paginationNavBtn}
                        onClick={() => { setTemplatePage(p => Math.min(totalTemplatePages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={templatePage === totalTemplatePages}
                      >
                        <span>Selanjutnya</span>
                        <ChevronRightIcon size={16} />
                      </button>
                    </div>

                    <span className={styles.paginationInfo}>
                      Halaman {templatePage} dari {totalTemplatePages} (Menampilkan {paginatedTemplates.length} dari {displayedTemplates.length} template)
                    </span>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* TAB 3: RIWAYAT SESI FOTO (DENGAN PENCARIAN SHARE CODE / ID) */}
        {activeTab === 'sessions' && (
          <section>
            <div className={styles.topBar}>
              <div className={styles.pageHeading}>
                <h1 className={styles.pageTitle}>Riwayat Foto Sesi &amp; Hasil Cetak ({sessions.length})</h1>
                <p className={styles.pageSubtitle}>Cari hasil foto strip berdasarkan Share Code (KB-...), ID sesi, atau template.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => loadSessions(secret)} disabled={isSessionsLoading}>
                <RefreshIcon size={14} className={isSessionsLoading ? 'animate-spin' : ''} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Live Search Bar for Sessions */}
            <div className={styles.filterBar}>
              <div className={styles.searchBox} style={{ flex: 1, minWidth: '340px' }}>
                <SearchIcon size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Cari Share Code (contoh: KB-...), ID sesi, atau nama template..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                />
                {sessionSearch && (
                  <button onClick={() => setSessionSearch('')} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {isSessionsLoading ? (
              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <span>Memuat data riwayat foto sesi...</span>
              </div>
            ) : displayedSessions.length === 0 ? (
              <div className={styles.emptyState}>
                <Mascot pose="searching" size="md" animated={false} />
                <p style={{ marginTop: 12, fontWeight: 600 }}>
                  {sessionSearch ? `Tidak ditemukan sesi dengan kata kunci "${sessionSearch}".` : 'Belum ada riwayat foto sesi.'}
                </p>
              </div>
            ) : (
              <>
                <div className={styles.sessionsGrid}>
                  {paginatedSessions.map(s => {
                    return (
                      <div key={s.id ?? s.share_code ?? `sess-${Math.random()}`} className={styles.sessionCard}>
                        <div className={styles.sessionThumbWrap} onClick={() => setPreviewLightboxImg(s.image_url ?? null)} title="Klik untuk lihat ukuran penuh">
                          {s.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={s.image_url} alt={s.share_code} className={styles.sessionThumb} loading="lazy" />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              Tidak ada preview
                            </div>
                          )}
                        </div>

                        <div className={styles.sessionInfo}>
                          <div className={styles.sessionTopRow}>
                            <span className={styles.sessionCode}>#{s.share_code}</span>
                            <span className={styles.sessionDate}>
                              {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                            </span>
                          </div>

                          <div className={styles.sessionActions}>
                            <button
                              className="btn btn-secondary btn-sm w-full"
                              onClick={() => window.open(s.image_url, '_blank')}
                            >
                              <ExternalLinkIcon size={14} />
                              <span>{s.image_url?.includes('supabase') ? 'Buka HD (Supabase)' : s.image_url?.includes('catbox') ? 'Buka HD (Catbox)' : 'Buka Gambar HD'}</span>
                            </button>
                            <div className={styles.sessionBottomRow}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => window.open(getShareUrl(s.share_code ?? ''), '_blank')}
                              >
                                <span>Halaman Hasil</span>
                              </button>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteSession(s.share_code ?? '')}
                                title="Hapus Sesi"
                              >
                                <TrashIcon size={14} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination Controls for Sessions */}
                {displayedSessions.length > SESSIONS_PER_PAGE && (
                  <div className={styles.paginationWrap}>
                    <div className={styles.paginationControls}>
                      <button
                        type="button"
                        className={styles.paginationNavBtn}
                        onClick={() => { setSessionPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={sessionPage === 1}
                      >
                        <ChevronLeftIcon size={16} />
                        <span>Sebelumnya</span>
                      </button>

                      <div className={styles.pageNumbers}>
                        {Array.from({ length: totalSessionPages }, (_, idx) => idx + 1).map(page => (
                          <button
                            key={page}
                            type="button"
                            className={`${styles.pageNumberBtn} ${sessionPage === page ? styles.pageNumberBtnActive : ''}`}
                            onClick={() => { setSessionPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={styles.paginationNavBtn}
                        onClick={() => { setSessionPage(p => Math.min(totalSessionPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={sessionPage === totalSessionPages}
                      >
                        <span>Selanjutnya</span>
                        <ChevronRightIcon size={16} />
                      </button>
                    </div>

                    <span className={styles.paginationInfo}>
                      Halaman {sessionPage} dari {totalSessionPages} (Menampilkan {paginatedSessions.length} dari {displayedSessions.length} sesi foto)
                    </span>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* TAB 4: UPLOAD & CHROMA KEY STUDIO */}
        {activeTab === 'upload' && (
          <section className={styles.uploadSection}>
            <div className={styles.topBar}>
              <div className={styles.pageHeading}>
                <h1 className={styles.pageTitle}>
                  {editingTemplateId ? 'Edit & Kustomisasi Template' : 'Upload Template Frame Canva'}
                </h1>
                <p className={styles.pageSubtitle}>
                  {editingTemplateId
                    ? `Kamu sedang mengedit template "${formName || editingTemplateId}". Sesuaikan warna, frame, atau susunan slot foto.`
                    : 'Rancang frame dengan Chroma Key otomatis untuk menghapus warna kotak foto & deteksi lubang foto presisi.'}
                </p>
              </div>
            </div>

            {editingTemplateId && (
              <div style={{
                background: '#E4F2E8',
                border: '1.5px solid #A2CFA9',
                padding: '14px 18px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem' }}>✏️</span>
                    <strong style={{ color: '#0D3B24', fontSize: '0.9375rem' }}>Mode Edit: {formName || editingTemplateId}</strong>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#2D5A3D' }}>
                    ID: <code>{editingTemplateId}</code> — Perubahan akan langsung menimpa template ini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary btn-sm"
                  style={{ background: '#FFFFFF', borderColor: '#A2CFA9' }}
                >
                  <CloseIcon size={14} />
                  <span>Batal Edit (Buat Baru)</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveAdminTemplate} className={styles.formGrid}>
              <div className={styles.formCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Nama Desain Template *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Luxury Emerald Vintage 2026"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Deskripsi Singkat</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Contoh: Frame estetik dengan floral accents dan typography elegan"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Pilih Susunan Slot Foto</label>
                  <div className={styles.presetGrid}>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '2-vert' ? styles.presetBtnActive : ''}`}
                      onClick={() => handlePresetChange('2-vert')}
                    >
                      2 Foto Vertikal
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '3-vert' ? styles.presetBtnActive : ''}`}
                      onClick={() => handlePresetChange('3-vert')}
                    >
                      3 Foto Vertikal
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '4-vert' ? styles.presetBtnActive : ''}`}
                      onClick={() => handlePresetChange('4-vert')}
                    >
                      4 Foto Vertikal
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '6-grid' ? styles.presetBtnActive : ''}`}
                      onClick={() => handlePresetChange('6-grid')}
                    >
                      6 Foto Grid
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Upload File Frame Canva (PNG Transparan / Kotak Hijau)</label>
                  <label className={styles.uploadBox}>
                    <UploadIcon size={28} style={{ color: 'var(--accent-1)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {rawImageSrc ? 'Ganti File Frame Canva' : 'Pilih Gambar Frame Canva (PNG/JPG)'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Mendukung 1 Strip (600×1800) dan Double Strip 4×6 (1200×1800)
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Chroma Key Studio Engine */}
                {rawImageSrc && (
                  <div className={styles.chromaBox}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0D3B24' }}>
                        Hapus Warna Kotak Foto (Chroma Key Transparan)
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleEyeDropper}
                      >
                        <EyedropperIcon size={14} />
                        <span>Pipet Layar</span>
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
                            reprocessChroma(rawImageSrc, presetColor.hex, chromaTolerance, chromaSmoothness, slotPadding)
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
                            reprocessChroma(rawImageSrc, e.target.value, chromaTolerance, chromaSmoothness, slotPadding)
                          }}
                          className={styles.colorInput}
                        />
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#0D3B24' }}>{chromaColor}</span>
                      </div>
                    </div>

                    {/* Interactive Click on Image Picker */}
                    <div className={styles.interactivePickerBox}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0D3B24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <EyedropperIcon size={14} />
                        <span>Atau klik langsung pada kotak foto di gambar ini untuk menghapus warnanya:</span>
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
                            reprocessChroma(rawImageSrc, chromaColor, val, chromaSmoothness, slotPadding)
                          }}
                          className={styles.chromaSlider}
                        />
                      </div>
                    </div>

                    {/* Padding Bleed Slider */}
                    <div className={styles.fieldGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0D3B24', fontWeight: 600 }}>
                        <span>Ekspansi Lebar Kotak Foto (Bleed):</span>
                        <span>+{slotPadding}px</span>
                      </div>
                      <div className={styles.chromaSliderWrap}>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={slotPadding}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSlotPadding(val)
                            reprocessChroma(rawImageSrc, chromaColor, chromaTolerance, chromaSmoothness, val)
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
                    <label className={styles.label}>Warna Background</label>
                    <input
                      type="color"
                      value={formBgColor}
                      onChange={(e) => setFormBgColor(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                    />
                  </div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Warna Aksen</label>
                    <input
                      type="color"
                      value={formAccentColor}
                      onChange={(e) => setFormAccentColor(e.target.value)}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tag Kategori (Pisahkan Koma)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="canva, aesthetic, vintage"
                  />
                </div>

                {formError && (
                  <div className={styles.formError}>
                    <AlertCircleIcon size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={isSavingTemplate || isProcessingChroma}
                  style={{ marginTop: '8px' }}
                >
                  <SparklesIcon size={18} />
                  <span>
                    {isSavingTemplate
                      ? 'Menyimpan ke Database...'
                      : editingTemplateId
                      ? 'Simpan Perubahan Template (Update)'
                      : 'Simpan & Terbitkan Template'}
                  </span>
                </button>
              </div>

              {/* Live Preview Column */}
              <div className={styles.previewCol}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
                  LIVE PREVIEW STRIP
                </span>
                <div className={styles.previewWrap}>
                  <TemplatePreview
                    template={{
                      id: 'admin-preview',
                      name: formName || 'Preview Template',
                      description: formDesc,
                      photoCount: formSlots.length,
                      stripWidth: formFrameDimensions.width,
                      stripHeight: formFrameDimensions.height,
                      backgroundColor: formBgColor,
                      accentColor: formAccentColor,
                      textColor: '#0C1E14',
                      frameImageUrl: processedFrameUrl || undefined,
                      frameMode: 'overlay',
                      slots: formSlots,
                      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
                      printSize: formFrameDimensions.width / formFrameDimensions.height > 0.5 ? '4x6' : '2x6',
                    }}
                    priority
                  />
                </div>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Full-Res Lightbox Modal */}
      {previewLightboxImg && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewLightboxImg(null)}>
          <div className={styles.lightboxCard} onClick={(e) => e.stopPropagation()}>
            <button
              style={{ position: 'absolute', top: -14, right: -14, background: '#FFFFFF', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              onClick={() => setPreviewLightboxImg(null)}
            >
              <CloseIcon size={16} />
            </button>
            <img src={previewLightboxImg} alt="Preview Hasil Full" className={styles.lightboxImg} />
          </div>
        </div>
      )}

      {/* Mascot Interactive Alert / Confirm Modal */}
      {mascotModal.isOpen && (
        <div className={styles.mascotModalOverlay} onClick={() => setMascotModal(prev => ({ ...prev, isOpen: false }))}>
          <div className={styles.mascotModalCard} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.mascotModalClose}
              onClick={() => setMascotModal(prev => ({ ...prev, isOpen: false }))}
              aria-label="Tutup dialog"
            >
              <CloseIcon size={16} />
            </button>

            <div className={styles.mascotModalBody}>
              <Mascot
                pose={mascotModal.pose}
                size="lg"
                animated
                showSpeech={Boolean(mascotModal.speechText)}
                speechText={mascotModal.speechText}
              />

              <div className={styles.mascotModalContent}>
                <h3 className={styles.mascotModalTitle}>{mascotModal.title}</h3>
                <p className={styles.mascotModalMessage}>{mascotModal.message}</p>
              </div>

              <div className={styles.mascotModalActions}>
                {mascotModal.type === 'confirm' || mascotModal.type === 'danger' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setMascotModal(prev => ({ ...prev, isOpen: false }))}
                    >
                      <span>{mascotModal.cancelText || 'Batal'}</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${mascotModal.type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => {
                        const action = mascotModal.onConfirm
                        setMascotModal(prev => ({ ...prev, isOpen: false }))
                        action?.()
                      }}
                      style={mascotModal.type === 'danger' ? { background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' } : undefined}
                    >
                      <span>{mascotModal.confirmText || 'Konfirmasi'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setMascotModal(prev => ({ ...prev, isOpen: false }))}
                    style={{ minWidth: '140px' }}
                  >
                    <span>{mascotModal.confirmText || 'Mengerti'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Mascot */}
      <FloatingMascotAssistant
        tipText="Halo Admin! Geser aku ke mana aja yaa kalau menghalangi tabel! 🛡️"
        pose="happy"
        title="Admin Kuro"
      />
    </div>
  )
}