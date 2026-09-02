'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import QRCode from 'qrcode'
import { getShareUrl } from '@/lib/utils'
import { getTemplate } from '@/lib/templates'
import { Session } from '@/lib/supabase'
import {
  CameraIcon,
  ArrowLeftIcon,
  CheckIcon,
  DownloadIcon,
  CopyIcon,
  PlusIcon,
} from '@/components/Icons'
import Mascot from '@/components/Mascot'
import FloatingMascotAssistant from '@/components/FloatingMascotAssistant'
import styles from './page.module.css'

interface Props {
  params: Promise<{ shareCode: string }>
}

export default function ResultPageInner({ params }: Props) {
  const { shareCode } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const shareUrl = getShareUrl(shareCode)

  useEffect(() => {
    async function load() {
      // 1. Check local session storage first (instant, 0 network latency, works offline)
      try {
        const localImg = sessionStorage.getItem('kurobooth_result_' + shareCode)
        if (localImg) {
          setImageUrl(localImg)
          setIsLoading(false)
        }
      } catch (e) {
        console.warn('SessionStorage read error:', e)
      }

      // 2. Query API if not already loaded or to sync session metadata
      try {
        const res = await fetch(`/api/sessions?shareCode=${shareCode}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data.session)
          if (data.session?.image_url) {
            setImageUrl(prev => prev || data.session.image_url)
          }
        }
      } catch {
        // Network error — image may not be available from API
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [shareCode])

  useEffect(() => {
    if (!shareUrl) return
    QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#14281D', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(console.error)
  }, [shareUrl])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard API not available
    }
  }

  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (!imageUrl) return
    setIsDownloading(true)
    const fileName = `kurobooth-strip-${shareCode}.png`
    try {
      let blobUrl: string | null = null

      // 1. Prioritas: ambil dari sessionStorage (instan, offline-capable)
      try {
        const localImg = sessionStorage.getItem('kurobooth_result_' + shareCode)
        if (localImg && localImg.startsWith('data:')) {
          const res = await fetch(localImg)
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
        }
      } catch { /* ignore */ }

      // 2. Jika tidak ada di sessionStorage, pakai server-side proxy download
      //    sehingga browser langsung download (bukan buka tab baru ke Supabase)
      if (!blobUrl && imageUrl) {
        const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(fileName)}`
        const res = await fetch(proxyUrl)
        if (res.ok) {
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
        }
      }

      if (blobUrl) {
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl!), 5000)
      } else {
        throw new Error('No blob available')
      }
    } catch {
      // Last resort: direct href (mungkin buka di tab baru, tapi masih bisa disave)
      const a = document.createElement('a')
      a.href = imageUrl
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setIsDownloading(false)
    }
  }


  let template = session ? getTemplate(session.template_id) : null
  if (!template && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('kurobooth_template_' + shareCode)
      if (stored) template = JSON.parse(stored)
    } catch {
      // Ignore parse error
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p>Memuat hasil fotomu...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Print-only area */}
      <div className={styles.printArea} ref={printRef}>
        {imageUrl && (
          <img src={imageUrl} alt="Hasil photobooth" className={styles.printImage} />
        )}
      </div>

      {/* Screen UI (hidden during print) */}
      <div className={`${styles.screenContent} no-print`}>
        {/* Header */}
        <header className={styles.header}>
          <div className="container">
            <div className={styles.headerInner}>
              <button id="back-to-home" className={`btn btn-ghost btn-sm ${styles.backBtn}`} onClick={() => router.push('/')}>
                <ArrowLeftIcon size={16} />
                <span>Buat Strip Baru</span>
              </button>
              <div className={styles.logo}>
                <div className={styles.logoBadge}>
                  <CameraIcon size={16} strokeWidth={2.2} />
                </div>
                <span className={styles.logoText}>KuroBooth</span>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <div className="container">
            <div className={styles.layout}>
              {/* Left: Strip photo */}
              <div className={styles.stripPanel}>
                <div className={styles.stripWrapper}>
                  {imageUrl ? (
                    <img
                      id="result-strip-image"
                      src={imageUrl}
                      alt="Hasil strip foto photobooth"
                      className={styles.stripImage}
                    />
                  ) : (
                    <div className={styles.stripPlaceholder}>Foto tidak ditemukan</div>
                  )}
                </div>
                {template && <p className={styles.templateLabel}>Template: {template.name}</p>}
              </div>

              {/* Right: Actions + QR */}
              <div className={styles.actionsPanel}>
                <div className={`animate-fade-in ${styles.successCard}`}>
                  <Mascot pose="happy" size={56} animated={false} />
                  <div className={styles.successCardText}>
                    <p className={styles.successTitle}>Foto Berhasil Dibuat! ✨</p>
                    <p className={styles.successSub}>Strip foto siap diunduh dengan resolusi tinggi, dicetak, atau dibagikan ke teman-temanmu.</p>
                  </div>
                </div>

                <div className={`animate-fade-in delay-100 ${styles.actionButtons}`}>
                  <h3 className={styles.actionTitle}>Aksi &amp; Simpan</h3>
                  <button id="btn-download" className={`btn btn-primary btn-lg w-full ${styles.actionBtn}`} onClick={handleDownload} disabled={isDownloading || !imageUrl}>
                    {isDownloading ? (
                      <>
                        <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        <span>Menyiapkan File...</span>
                      </>
                    ) : (
                      <>
                        <DownloadIcon size={18} />
                        <span>Download Foto Strip (PNG)</span>
                      </>
                    )}
                  </button>
                  <button id="btn-copy-link" className={`btn btn-secondary btn-lg w-full ${styles.actionBtn}`} onClick={handleCopyLink}>
                    {copied ? (
                      <>
                        <CheckIcon size={18} />
                        <span>Link Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={18} />
                        <span>Salin Link Berbagi</span>
                      </>
                    )}
                  </button>
                </div>

                <div className={`animate-fade-in delay-200 ${styles.qrSection}`}>
                  <h3 className={styles.actionTitle}>Scan QR Code di HP</h3>
                  <div
                    className={styles.qrWrapper}
                    onClick={() => setQrModalOpen(true)}
                    title="Klik untuk memperbesar QR Code agar mudah di-scan"
                    style={{ cursor: 'pointer' }}
                  >
                    {qrDataUrl ? (
                      <img id="qr-code-image" src={qrDataUrl} alt="QR Code untuk share foto" className={styles.qrImage} />
                    ) : (
                      <div className={`${styles.qrPlaceholder} skeleton`} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent-1)', cursor: 'pointer' }} onClick={() => setQrModalOpen(true)}>
                    🔍 Klik QR Code untuk Memperbesar
                  </span>
                  <p className={styles.qrHint}>Arahkan kamera ponsel atau Google Lens ke QR Code untuk membuka &amp; menyimpan foto</p>
                  <div className={styles.shareUrlBox}>
                    <span className={styles.shareUrl}>{shareUrl}</span>
                  </div>
                </div>

                <button id="btn-new-session" className={`btn btn-ghost w-full animate-fade-in delay-300 ${styles.newBtn}`} onClick={() => router.push('/')}>
                  <PlusIcon size={16} />
                  <span>Ambil Foto Baru</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Large QR Lightbox Modal for Easy Scanning */}
        {qrModalOpen && qrDataUrl && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(12, 30, 20, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setQrModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Mascot pose="camera" size={48} animated={false} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0D3B24' }}>Scan QR Code di Layar</h3>
                <p style={{ fontSize: '0.8125rem', color: '#4A6B53', marginTop: '2px' }}>
                  Buka kamera HP atau Google Lens dan arahkan langsung ke QR Code di bawah:
                </p>
              </div>

              <div
                style={{
                  width: '240px',
                  height: '240px',
                  padding: '12px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '2px solid #D2E7D6',
                  boxShadow: '0 4px 16px rgba(12, 30, 20, 0.08)',
                }}
              >
                <img src={qrDataUrl} alt="QR Code Besar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              <div style={{ background: '#F4F8F5', border: '1px solid #DFE8E1', borderRadius: '12px', padding: '8px 12px', width: '100%' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#0D3B24', wordBreak: 'break-all' }}>
                  {shareUrl}
                </span>
              </div>

              <button className="btn btn-primary w-full" onClick={() => setQrModalOpen(false)}>
                <span>Tutup QR Code</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Mascot Assistant */}
        <FloatingMascotAssistant
          tipText="Yeay! Foto strip kamu sudah selesai. Download sekarang atau scan QR ya! 🎉"
          pose="sparkle"
          title="Foto Selesai"
        />
      </div>
    </div>
  )
}