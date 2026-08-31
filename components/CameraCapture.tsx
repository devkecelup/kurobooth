'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  CameraIcon,
  VideoIcon,
  FlipHorizontalIcon,
  RefreshIcon,
  CloseIcon,
  AlertCircleIcon,
} from './Icons'
import styles from './CameraCapture.module.css'

interface Props {
  onCapture: (dataUrl: string) => void
  aspectRatio?: number
}

export default function CameraCapture({ onCapture, aspectRatio = 4 / 3 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isActive, setIsActive] = useState(false)
  const [isMirrored, setIsMirrored] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [flash, setFlash] = useState(false)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      stopCamera()
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [isActive])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setIsActive(true)
    } catch (err) {
      console.error(err)
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.')
        } else if (err.name === 'NotFoundError') {
          setError('Perangkat kamera tidak ditemukan. Silakan gunakan opsi Upload File.')
        } else {
          setError('Gagal mengakses kamera. Silakan coba lagi atau gunakan Upload File.')
        }
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsActive(false)
  }

  async function flipCamera() {
    stopCamera()
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    setIsMirrored(newMode === 'user')
    setTimeout(() => startCameraWithMode(newMode), 100)
  }

  async function startCameraWithMode(mode: 'user' | 'environment') {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setIsActive(true)
    } catch {
      setError('Gagal mengganti kamera.')
    }
  }

  function startCountdown() {
    if (countdown !== null) return
    let count = 3
    setCountdown(count)
    countdownIntervalRef.current = setInterval(() => {
      count--
      if (count === 0) {
        clearInterval(countdownIntervalRef.current!)
        countdownIntervalRef.current = null
        setCountdown(null)
        capturePhoto()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  function cancelCountdown() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdown(null)
  }

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setIsCapturing(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 200)

    const vw = video.videoWidth
    const vh = video.videoHeight
    let sx = 0, sy = 0, sw = vw, sh = vh
    const imgRatio = vw / vh

    if (imgRatio > aspectRatio) {
      sw = vh * aspectRatio
      sx = (vw - sw) / 2
    } else {
      sh = vw / aspectRatio
      sy = (vh - sh) / 2
    }

    canvas.width = Math.round(sw)
    canvas.height = Math.round(sh)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (isMirrored) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    onCapture(dataUrl)
    setTimeout(() => setIsCapturing(false), 400)
  }, [aspectRatio, isMirrored, onCapture])

  if (!isActive) {
    return (
      <div className={styles.startScreen}>
        {error && (
          <div className={styles.errorMsg}>
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}
        <div className={styles.cameraIconWrapper}>
          <div className={styles.cameraIconPulse} />
          <CameraIcon size={32} className={styles.cameraIcon} strokeWidth={1.75} />
        </div>
        <p className={styles.startText}>Kamera belum aktif. Klik tombol di bawah untuk mulai berfoto.</p>
        <button
          id="btn-start-camera"
          className={`btn btn-primary btn-lg ${styles.startBtn}`}
          onClick={startCamera}
        >
          <VideoIcon size={18} />
          <span>Aktifkan Kamera</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.cameraWrapper}>
        {flash && <div className={styles.flash} aria-hidden />}

        {countdown !== null && (
          <div
            className={styles.countdownOverlay}
            aria-live="assertive"
            onClick={cancelCountdown}
          >
            <div className={styles.countdownRing}>
              <span className={styles.countdownNum} key={countdown}>{countdown}</span>
            </div>
            <span className={styles.countdownCancel}>Klik di mana saja untuk membatalkan</span>
          </div>
        )}

        <video
          ref={videoRef}
          className={styles.video}
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className={styles.hiddenCanvas} />

        <div className={styles.topControls}>
          <button
            id="btn-mirror"
            className={styles.iconBtn}
            onClick={() => setIsMirrored(m => !m)}
            title={isMirrored ? 'Matikan mode cermin' : 'Aktifkan mode cermin'}
            aria-label="Toggle Mirror"
          >
            <FlipHorizontalIcon size={16} />
          </button>
          <button
            id="btn-flip-camera"
            className={styles.iconBtn}
            onClick={flipCamera}
            title="Ganti kamera depan/belakang"
            aria-label="Ganti Kamera"
          >
            <RefreshIcon size={16} />
          </button>
          <button
            id="btn-stop-camera"
            className={styles.iconBtn}
            onClick={stopCamera}
            title="Matikan kamera"
            aria-label="Tutup Kamera"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className={styles.captureArea}>
        <button
          id="btn-capture"
          className={`${styles.captureBtn}${isCapturing ? ' ' + styles.capturing : ''}${countdown !== null ? ' ' + styles.countingDown : ''}`}
          onClick={startCountdown}
          aria-label="Ambil foto dengan hitung mundur 3 detik"
          disabled={isCapturing}
        >
          <span className={styles.captureBtnRing} />
          <span className={styles.captureBtnInner}>
            {countdown !== null ? (
              <span className={styles.captureBtnCount} key={countdown}>{countdown}</span>
            ) : (
              <CameraIcon size={24} className={styles.captureBtnIcon} strokeWidth={2} />
            )}
          </span>
        </button>
        <span className={styles.captureHint}>
          {countdown !== null ? 'Bersiap di depan kamera...' : 'Tekan tombol untuk foto (otomatis 3 detik)'}
        </span>
      </div>
    </div>
  )
}