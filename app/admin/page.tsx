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
} from '@/components/Icons'
import Mascot from '@/components/Mascot'
import TemplatePreview from '@/components/TemplatePreview'
import { TemplateConfig } from '@/lib/templates'
import { getShareUrl } from '@/lib/utils'
import styles from './page.module.css'

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

export default function AdminPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'sessions' | 'upload'>('overview')

  // Data State
  const [templates, setTemplates] = useState<TemplateConfig[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionsLoading, setIsSessionsLoading] = useState(false)

  // Template Search & Filter State
  const [templateFilter, setTemplateFilter] = useState<'all' | 'active' | 'pending'>('all')
  const [templateSearch, setTemplateSearch] = useState('')

  // Session Search State
  const [sessionSearch, setSessionSearch] = useState('')
  const [previewLightboxImg, setPreviewLightboxImg] = useState<string | null>(null)

  // Actions Loading State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  // Form State for Canva Template Creation
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPreset, setFormPreset] = useState<'4-vert' | '3-vert' | '6-grid'>('4-vert')
  const [formSlots, setFormSlots] = useState<any[]>(PRESET_4_VERTICAL)
  const [formBgColor, setFormBgColor] = useState('#FFFFFF')
  const [formAccentColor, setFormAccentColor] = useState('#0D3B24')
  const [formTags, setFormTags] = useState('canva, strip')
  const [rawImageSrc, setRawImageSrc] = useState('')
  const [processedFrameUrl, setProcessedFrameUrl] = useState('')
  const [chromaColor, setChromaColor] = useState('#00FF00')
  const [chromaTolerance, setChromaTolerance] = useState(35)
  const [chromaSmoothness, setChromaSmoothness] = useState(5)
  const [slotPadding, setSlotPadding] = useState(15)
  const [detectedSlotCount, setDetectedSlotCount] = useState(0)
  const [isProcessingChroma, setIsProcessingChroma] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [formError, setFormError] = useState('')

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
      if (result.detectedSlots && result.detectedSlots.length > 0) {
        setFormSlots(result.detectedSlots)
        setDetectedSlotCount(result.detectedSlots.length)
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

  // Auto-restore admin session from sessionStorage
  useEffect(() => {
    try {
      const savedSecret = sessionStorage.getItem('kurobooth_admin_secret')
      if (savedSecret) {
        setSecret(savedSecret)
        setIsLoggedIn(true)
        loadTemplates(savedSecret)
        loadSessions(savedSecret)
      }
    } catch {}
  }, [loadTemplates, loadSessions])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) {
      setLoginError('Silakan masukkan kata sandi admin.')
      return
    }
    setIsLoggedIn(true)
    setLoginError('')
    try {
      sessionStorage.setItem('kurobooth_admin_secret', secret)
    } catch {}
    loadTemplates(secret)
    loadSessions(secret)
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem('kurobooth_admin_secret')
    } catch {}
    setIsLoggedIn(false)
    setSecret('')
  }

  // Approve pending template
  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}&action=approve`, {
        method: 'PATCH',
        headers: { 'x-admin-secret': secret },
      })
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: true } : t))
        setActionSuccessMsg('Template berhasil disetujui dan diterbitkan ke galeri publik!')
        setTimeout(() => setActionSuccessMsg(null), 3500)
      }
    } catch (e) {
      console.error('Approve error:', e)
    }
  }

  // Reject / Delete template immediately
  async function handleDelete(id: string, isReject: boolean = false) {
    const promptText = isReject
      ? 'Apakah Anda yakin ingin MENOLAK dan MENGHAPUS template sumbangan ini?'
      : 'Apakah Anda yakin ingin menghapus template ini?'
    if (!confirm(promptText)) return

    setDeleteId(id)
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      })
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        setActionSuccessMsg(isReject ? 'Template berhasil ditolak dan dihapus.' : 'Template berhasil dihapus.')
        setTimeout(() => setActionSuccessMsg(null), 3500)
      }
    } catch (e) {
      console.error('Delete template error:', e)
    } finally {
      setDeleteId(null)
    }
  }

  // Delete session
  async function handleDeleteSession(shareCode: string) {
    if (!confirm('Apakah kamu yakin ingin menghapus foto sesi ini?')) return
    try {
      const res = await fetch(`/api/admin/sessions?shareCode=${encodeURIComponent(shareCode)}&secret=${encodeURIComponent(secret)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.share_code !== shareCode))
        setActionSuccessMsg('Riwayat foto sesi berhasil dihapus.')
        setTimeout(() => setActionSuccessMsg(null), 3500)
      }
    } catch (e) {
      console.error('Delete session error:', e)
    }
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
        reprocessChroma(base64, chromaColor, chromaTolerance, chromaSmoothness, slotPadding)
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
          const { dataURLToBlob, generateShareCode } = await import('@/lib/utils')
          const blob = dataURLToBlob(finalFrameUrl)
          const frameCode = 'frame-admin-' + generateShareCode()
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
        name: formName,
        description: formDesc,
        photoCount: formSlots.length,
        stripWidth: 600,
        stripHeight: 1800,
        backgroundColor: formBgColor,
        accentColor: formAccentColor,
        textColor: '#0C1E14',
        frameImageUrl: finalFrameUrl || undefined,
        frameMode: 'overlay',
        slots: formSlots,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        printSize: '2x6',
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
        setActionSuccessMsg('Template Canva berhasil disimpan dan langsung aktif!')
        setTimeout(() => setActionSuccessMsg(null), 3500)
        setFormName('')
        setFormDesc('')
        setRawImageSrc('')
        setProcessedFrameUrl('')
        loadTemplates(secret)
        setActiveTab('templates')
      } else {
        setFormError(data.error || 'Gagal menyimpan template.')
      }
    } catch {
      setFormError('Terjadi kesalahan koneksi saat menyimpan template.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Filtered Templates
  const activeTemplates = templates.filter(t => t.isActive !== false)
  const pendingTemplates = templates.filter(t => t.isActive === false)
  const displayedTemplates = templates.filter(t => {
    if (templateFilter === 'active' && t.isActive === false) return false
    if (templateFilter === 'pending' && t.isActive !== false) return false
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
    const q = sessionSearch.toLowerCase()
    return (
      (s.share_code && s.share_code.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.template_id && s.template_id.toLowerCase().includes(q))
    )
  })

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
            <button id="btn-login" type="submit" className="btn btn-primary w-full">
              <span>Masuk Dashboard</span>
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

            {/* Pending Template Review Notice */}
            {pendingTemplates.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '16px', padding: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Mascot pose="sparkle" size={48} animated={false} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#92400E' }}>Ada {pendingTemplates.length} Template Sumbangan Menunggu Kurasi!</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#B45309', marginTop: '2px' }}>Tinjau dan setujui karya kreator agar langsung tampil di galeri publik.</p>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setActiveTab('templates'); setTemplateFilter('pending') }}>
                  <span>Tinjau Sekarang</span>
                </button>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                <PlusIcon size={16} />
                <span>+ Upload Template Canva Baru</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('sessions')}>
                <SearchIcon size={16} />
                <span>Cari Riwayat Foto Sesi</span>
              </button>
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
                  Menunggu Persetujuan ({pendingTemplates.length})
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
              <div className={styles.templateGridList}>
                {displayedTemplates.map(t => (
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
                        {t.isActive === false && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '999px', border: '1px solid #FCD34D' }}>
                            🟡 Pending Review
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
                              onClick={() => handleApprove(t.id)}
                              style={{ flex: 1, background: '#10B981', borderColor: '#059669' }}
                            >
                              <CheckCircleIcon size={14} />
                              <span>Setujui</span>
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(t.id, true)}
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
                              onClick={() => window.open('/booth/' + t.id, '_blank')}
                            >
                              <ExternalLinkIcon size={14} />
                              <span>Buka Booth</span>
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(t.id)}
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
              <div className={styles.sessionsGrid}>
                {displayedSessions.map(s => {
                  return (
                    <div key={s.id || s.share_code} className={styles.sessionCard}>
                      <div className={styles.sessionThumbWrap} onClick={() => setPreviewLightboxImg(s.image_url)} title="Klik untuk lihat ukuran penuh">
                        <img
                          src={s.image_url}
                          alt={`Strip ${s.share_code}`}
                          className={styles.sessionThumb}
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.img-error-badge')) {
                              const badge = document.createElement('div')
                              badge.className = 'img-error-badge'
                              badge.style.cssText = 'padding: 16px; text-align: center; color: #E05252; font-size: 0.75rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 100%;'
                              badge.innerHTML = '<span style="font-size: 1.5rem;">⚠️</span><strong style="color: #FFFFFF;">Gambar Tidak Ditemukan</strong><span style="font-size: 0.6875rem; color: #A0AEC0;">Tersimpan sebelum Supabase Storage aktif</span>'
                              parent.appendChild(badge)
                            }
                          }}
                        />
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
                              onClick={() => window.open(getShareUrl(s.share_code), '_blank')}
                            >
                              <span>Halaman Hasil</span>
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteSession(s.share_code)}
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
            )}
          </section>
        )}

        {/* TAB 4: UPLOAD & CHROMA KEY STUDIO */}
        {activeTab === 'upload' && (
          <section className={styles.uploadSection}>
            <div className={styles.topBar}>
              <div className={styles.pageHeading}>
                <h1 className={styles.pageTitle}>Upload Template Frame Canva</h1>
                <p className={styles.pageSubtitle}>Rancang frame dengan Chroma Key otomatis untuk menghapus warna kotak foto &amp; deteksi lubang foto presisi.</p>
              </div>
            </div>

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
                      className={`${styles.presetBtn} ${formPreset === '4-vert' ? styles.presetBtnActive : ''}`}
                      onClick={() => { setFormPreset('4-vert'); setFormSlots(PRESET_4_VERTICAL); setDetectedSlotCount(0) }}
                    >
                      4 Foto Vertikal
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '3-vert' ? styles.presetBtnActive : ''}`}
                      onClick={() => { setFormPreset('3-vert'); setFormSlots(PRESET_3_VERTICAL); setDetectedSlotCount(0) }}
                    >
                      3 Foto Vertikal
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formPreset === '6-grid' ? styles.presetBtnActive : ''}`}
                      onClick={() => { setFormPreset('6-grid'); setFormSlots(PRESET_6_GRID); setDetectedSlotCount(0) }}
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rasio ideal 1:3 (600 × 1800 px) 300 DPI</span>
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
                  <span>{isSavingTemplate ? 'Menyimpan ke Database...' : 'Simpan & Terbitkan Template'}</span>
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
                      stripWidth: 600,
                      stripHeight: 1800,
                      backgroundColor: formBgColor,
                      accentColor: formAccentColor,
                      textColor: '#0C1E14',
                      frameImageUrl: processedFrameUrl || undefined,
                      frameMode: 'overlay',
                      slots: formSlots,
                      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
                      printSize: '2x6',
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
    </div>
  )
}