'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { TemplateConfig } from '@/lib/templates'
import { generateShareCode, dataURLToBlob, PhotoAdjustment } from '@/lib/utils'
import CameraCapture from '@/components/CameraCapture'
import TemplatePreview from '@/components/TemplatePreview'
import FloatingMascotAssistant from '@/components/FloatingMascotAssistant'
import {
  ArrowLeftIcon,
  CameraIcon,
  UploadIcon,
  SparklesIcon,
  AlertCircleIcon,
} from '@/components/Icons'
import styles from './page.module.css'

interface Props {
  params: Promise<{ templateId: string }>
}

type SlotPhoto = string | null
type Mode = 'camera' | 'upload'
type Step = 'capture' | 'review'

export default function BoothPage({ params }: Props) {
  const { templateId } = use(params)
  const router = useRouter()

  const [template, setTemplate] = useState<TemplateConfig | null | undefined>(undefined)
  const [photos, setPhotos] = useState<SlotPhoto[]>([])
  const [adjustments, setAdjustments] = useState<PhotoAdjustment[]>([])
  const [activeSlot, setActiveSlot] = useState<number>(0)
  const [mode, setMode] = useState<Mode>('camera')
  const [step, setStep] = useState<Step>('capture')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTemplate() {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      try {
        const res = await fetch('/api/templates?id=' + encodeURIComponent(templateId), { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          const data = await res.json()
          const t = data.template as TemplateConfig
          setTemplate(t)
          setPhotos(Array(t.photoCount).fill(null))
          setAdjustments(Array(t.photoCount).fill(null).map(() => ({ zoom: 1, offsetX: 0, offsetY: 0 })))
        } else {
          setTemplate(null)
        }
      } catch {
        clearTimeout(timeout)
        setTemplate(null)
      }
    }
    loadTemplate()
  }, [templateId])

  const allFilled = photos.length > 0 && photos.every(p => p !== null)

  const handleFinalize = useCallback(() => {
    if (!allFilled) return
    setStep('review')
  }, [allFilled])

  if (template === undefined) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Memuat konfigurasi template...</p>
      </div>
    )
  }

  if (template === null) {
    return (
      <div className={styles.notFound}>
        <h1>Template Tidak Ditemukan</h1>
        <p>Maaf, template yang kamu cari tidak tersedia.</p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>
          <ArrowLeftIcon size={16} />
          <span>Kembali ke Galeri</span>
        </button>
      </div>
    )
  }

  const filledCount = photos.filter(p => p !== null).length

  function handlePhotoCapture(dataUrl: string) {
    const next = [...photos]
    next[activeSlot] = dataUrl
    setPhotos(next)
    const nextEmpty = next.findIndex((p, i) => i > activeSlot && p === null)
    if (nextEmpty !== -1) {
      setActiveSlot(nextEmpty)
    } else {
      const firstEmpty = next.findIndex(p => p === null)
      if (firstEmpty !== -1) setActiveSlot(firstEmpty)
    }
  }

  function handleRetake(index: number) {
    const next = [...photos]
    next[index] = null
    setPhotos(next)
    setActiveSlot(index)
    setStep('capture')
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) handlePhotoCapture(ev.target.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSubmit() {
    if (!template) return
    setIsProcessing(true)
    try {
      const scale = 2 // 2x scale for 300+ DPI Ultra HD print resolution (1200x3600 px)
      const canvas = document.createElement('canvas')
      canvas.width = (template.stripWidth || 600) * scale
      canvas.height = (template.stripHeight || 1800) * scale
      const ctx = canvas.getContext('2d')!
      const { renderStripToCanvas } = await import('@/lib/renderStrip')
      await renderStripToCanvas(ctx, template, photos as string[], adjustments, scale)
      const dataUrl = canvas.toDataURL('image/png')
      const blob = dataURLToBlob(dataUrl)
      const shareCode = generateShareCode()

      // 1. Save locally in browser high-capacity IndexedDB as instant 0ms source
      try {
        const { saveLocalResult } = await import('@/lib/localStore')
        await saveLocalResult(shareCode, dataUrl)
        sessionStorage.setItem('kurobooth_template_' + shareCode, JSON.stringify(template))
      } catch (e) {
        console.warn('Could not save to localStore:', e)
      }

      const formData = new FormData()
      formData.append('file', blob, shareCode + '.png')
      formData.append('shareCode', shareCode)
      
      let imageUrl = dataUrl // default to safe local dataUrl fallback
      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          if (uploadData.url) imageUrl = uploadData.url
        }
      } catch (e) {
        console.warn('Upload API call failed, using dataUrl:', e)
      }

      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template.id, imageUrl, shareCode }),
        })
      } catch (e) {
        console.warn('Session API call failed:', e)
      }

      // Always navigate cleanly without huge base64 query params
      router.push('/result/' + shareCode)
    } catch (err) {
      console.error(err)
      setError('Terjadi kendala saat memproses foto. Silakan coba kembali.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerInner}>
            <button
              id="back-to-gallery"
              className={`btn btn-ghost btn-sm ${styles.backBtn}`}
              onClick={() => router.push('/')}
              aria-label="Kembali ke galeri template"
            >
              <ArrowLeftIcon size={16} />
              <span>Galeri</span>
            </button>
            <div className={styles.templateBadge}>
              <span className={styles.templateName}>{template.name}</span>
              <span className={styles.templatePhotoCount}>{template.photoCount} foto</span>
            </div>
            <div className={styles.progressInfo}>
              <span className={styles.progressText}>{filledCount} / {template.photoCount} terisi</span>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: (filledCount / template.photoCount * 100) + '%' }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className="container">
          <div className={styles.layout}>
            {step === 'capture' && (
              <div className={styles.capturePanel}>
                <div className={styles.modeTabs} role="tablist" aria-label="Mode foto">
                  <button
                    id="tab-camera"
                    role="tab"
                    aria-selected={mode === 'camera'}
                    className={styles.modeTab + (mode === 'camera' ? ' ' + styles.modeTabActive : '')}
                    onClick={() => setMode('camera')}
                  >
                    <CameraIcon size={16} />
                    <span>Kamera</span>
                  </button>
                  <button
                    id="tab-upload"
                    role="tab"
                    aria-selected={mode === 'upload'}
                    className={styles.modeTab + (mode === 'upload' ? ' ' + styles.modeTabActive : '')}
                    onClick={() => setMode('upload')}
                  >
                    <UploadIcon size={16} />
                    <span>Upload File</span>
                  </button>
                </div>

                <div className={styles.slotIndicator}>
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      id={'slot-btn-' + i}
                      className={styles.slotDot + (activeSlot === i ? ' ' + styles.slotDotActive : photo ? ' ' + styles.slotDotFilled : '')}
                      onClick={() => setActiveSlot(i)}
                      aria-label={'Foto ke-' + (i + 1) + (photo ? ' (terisi)' : '')}
                    >
                      <span className={styles.slotDotNum}>{i + 1}</span>
                    </button>
                  ))}
                </div>

                <p className={styles.slotLabel}>
                  Mengambil foto ke-<strong>{activeSlot + 1}</strong> dari <strong>{template.photoCount}</strong>
                </p>

                {mode === 'camera' ? (
                  <CameraCapture
                    onCapture={handlePhotoCapture}
                    aspectRatio={template.slots[activeSlot].width / template.slots[activeSlot].height}
                  />
                ) : (
                  <div className={styles.uploadArea}>
                    <label htmlFor={'upload-input-' + activeSlot} className={styles.uploadLabel}>
                      <div className={styles.uploadIconWrap}>
                        <UploadIcon size={28} className={styles.uploadSvg} />
                      </div>
                      <p className={styles.uploadText}>Klik atau drag &amp; drop foto di sini</p>
                      <p className={styles.uploadHint}>Mendukung JPG, PNG, WEBP dengan resolusi asli</p>
                      <span className="btn btn-secondary btn-sm">Pilih File Foto</span>
                      <input id={'upload-input-' + activeSlot} type="file" accept="image/*" className={styles.uploadInput} onChange={handleUpload} />
                    </label>
                  </div>
                )}

                {allFilled && (
                  <button id="btn-review" className={'btn btn-primary btn-lg w-full animate-fade-in ' + styles.finalizeBtn} onClick={handleFinalize}>
                    <SparklesIcon size={18} />
                    <span>Review Hasil Foto</span>
                  </button>
                )}
              </div>
            )}

            {step === 'review' && (
              <div className={styles.capturePanel + ' animate-fade-in'}>
                <div className={styles.reviewHeader}>
                  <div className="badge badge-accent">
                    <SparklesIcon size={13} />
                    <span>Strip Siap Dicetak</span>
                  </div>
                  <h2 className={styles.reviewTitle}>Preview &amp; Siap Simpan</h2>
                  <p className={styles.reviewSubtitle}>
                    💡 <strong>Sentuh / klik &amp; geser foto langsung pada Strip Preview</strong> di sebelah untuk menyesuaikan posisi muka atau scroll mouse untuk zoom. Klik tombol <strong>Retake</strong> pada foto yang ingin kamu foto ulang!
                  </p>
                </div>

                {error && (
                  <div className={styles.errorBanner}>
                    <AlertCircleIcon size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.reviewActions}>
                  <button id="btn-back-capture" className="btn btn-secondary" onClick={() => setStep('capture')} disabled={isProcessing}>
                    <ArrowLeftIcon size={16} />
                    <span>Ambil Foto Lagi</span>
                  </button>
                  <button id="btn-process" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <div className={styles.btnSpinner} />
                        <span>Memproses Strip...</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon size={18} />
                        <span>Simpan &amp; Lanjutkan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className={styles.previewPanel}>
              <div className={styles.previewLabel}>
                <span>Live Preview Strip</span>
                <span className={styles.previewSize}>
                  {template.printSize === '4x6' || (template.stripWidth && template.stripHeight && (template.stripWidth / template.stripHeight > 0.5)) ? '4 × 6 inch' : '2 × 6 inch'}
                </span>
              </div>
              <div className={styles.previewWrapper}>
                <TemplatePreview
                  template={template}
                  photos={photos}
                  adjustments={adjustments}
                  onAdjustSlot={step === 'review' ? (idx, adj) => {
                    setAdjustments(prev => {
                      const copy = [...prev]
                      copy[idx] = adj
                      return copy
                    })
                  } : undefined}
                  onRetakeSlot={step === 'review' ? (idx) => handleRetake(idx) : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Contextual Mascot Guide in Corner */}
      <FloatingMascotAssistant
        tipText={
          step === 'capture'
            ? allFilled
              ? 'Foto sudah lengkap! Klik Review Hasil Foto ya 🎉'
              : mode === 'camera'
              ? `Foto ke-${activeSlot + 1}: Siap-siap, senyum ke kamera! 📸`
              : `Pilih atau upload file foto ke-${activeSlot + 1} dari galeri 🖼️`
            : 'Geser foto atau atur slider zoom agar muka pas di frame! ✨'
        }
        pose={
          step === 'capture'
            ? allFilled
              ? 'sparkle'
              : mode === 'camera'
              ? 'camera'
              : 'artist'
            : 'happy'
        }
        title="Tips Kuro"
      />
    </div>
  )
}