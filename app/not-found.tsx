'use client'

import { useState } from 'react'
import Link from 'next/link'
import Mascot, { MascotPose } from '@/components/Mascot'
import {
  CameraIcon,
  PaletteIcon,
  QrCodeIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@/components/Icons'
import styles from './not-found.module.css'

const SPEECH_MESSAGES: Record<MascotPose, string> = {
  lost: 'Oops! Halaman ini gak ada di album foto Kuro... 🧭',
  searching: 'Kuro udah cari ke semua rol film, tetep gak ketemu! 🔍',
  camera: 'Gak usah sedih, yuk jepret foto seru baru bareng Kuro! 📸',
  sparkle: 'Setiap jepretan adalah kenangan estetik! ✨',
  happy: 'Ayo balik ke beranda dan pilih template favoritmu! 🎉',
  waving: 'Hai! Jangan tersesat lagi ya, yuk foto bareng! 🌟',
  artist: 'Atau mau buat template frame kreasimu sendiri? 🎨',
}

const POSE_SEQUENCE: MascotPose[] = ['lost', 'searching', 'camera', 'sparkle', 'happy']

export default function NotFoundPage() {
  const [poseIndex, setPoseIndex] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [polaroidCaption, setPolaroidCaption] = useState('Foto Hilang!')

  const currentPose = POSE_SEQUENCE[poseIndex]

  // Play a quick synthesized camera click / beep with Web Audio API
  function playCameraSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1)

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.1)
    } catch {
      // Web Audio not supported or blocked
    }
  }

  function handleMascotClick() {
    const nextIdx = (poseIndex + 1) % POSE_SEQUENCE.length
    setPoseIndex(nextIdx)
    playCameraSound()
  }

  function handleTriggerFlash() {
    playCameraSound()
    setIsFlashing(true)
    setTimeout(() => {
      setIsFlashing(false)
    }, 450)
  }

  function handlePolaroidClick() {
    playCameraSound()
    const captions = ['Foto Hilang!', 'Missing 404!', 'Cari Lagi? 📸', 'Yuk Foto Bareng! ✨']
    setPolaroidCaption(prev => {
      const idx = captions.indexOf(prev)
      return captions[(idx + 1) % captions.length]
    })
  }

  return (
    <div className={styles.container}>
      {/* Background ambient glows */}
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />

      {/* Screen flash effect */}
      <div
        className={`${styles.flashOverlay} ${isFlashing ? styles.flashOverlayActive : ''}`}
        aria-hidden="true"
      />

      {/* Top Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.brandLink}>
          <div className={styles.brandLogoWrap}>
            <Mascot pose="happy" size={26} animated={false} />
          </div>
          <div className={styles.brandTitle}>
            <span>KuroBooth</span>
            <span className={styles.brandBadge}>Studio</span>
          </div>
        </Link>

        <Link href="/" className={styles.homeDirectBtn}>
          <ArrowRightIcon size={14} style={{ transform: 'rotate(180deg)' }} />
          <span>Beranda</span>
        </Link>
      </header>

      {/* Main 404 Hero Content */}
      <main className={styles.main}>
        <div className={styles.card}>
          {/* Top Tape Deco */}
          <div className={styles.filmStripTape}>
            <SparklesIcon size={13} />
            <span>KuroBooth 404 Error</span>
          </div>

          {/* Interactive Mascot & Polaroid Stage */}
          <div className={styles.stage}>
            {/* Mascot with Speech */}
            <div className={styles.mascotWrap} onClick={handleMascotClick}>
              <Mascot
                pose={currentPose}
                size="hero"
                animated
                showSpeech
                speechText={SPEECH_MESSAGES[currentPose]}
              />
              <span className={styles.mascotClickBadge}>
                <SparklesIcon size={12} />
                <span>Klik Kuro untuk Pose Baru</span>
              </span>
            </div>

            {/* Floating Missing Polaroid Card */}
            <div
              className={styles.polaroid}
              onClick={handlePolaroidClick}
              title="Klik polaroid untuk mengubah tulisan!"
            >
              <div className={styles.polaroidTape} />
              <div className={styles.polaroidInner}>
                <div className={styles.polaroidNoise} />
                <span className={styles.polaroidText404}>404</span>
                <CameraIcon size={28} style={{ opacity: 0.6 }} />
                <span className={styles.polaroidCaption}>[ Tidak Ditemukan ]</span>
              </div>
              <div className={styles.polaroidLabel}>
                <span>{polaroidCaption}</span>
              </div>
            </div>
          </div>

          {/* Error Message & Details */}
          <h1 className={styles.title}>Oops! Halaman Tidak Ditemukan</h1>
          <p className={styles.description}>
            Sepertinya kamu berada di luar bilik photobooth. Halaman yang kamu tuju mungkin sudah
            dipindahkan, linknya salah ketik, atau fotonya belum diambil!
          </p>

          {/* Call to Actions */}
          <div className={styles.actions}>
            <Link href="/" className="btn btn-primary btn-lg">
              <PaletteIcon size={18} />
              <span>Pilih Template Foto</span>
            </Link>

            <Link href="/" className="btn btn-secondary btn-lg">
              <span>Kembali ke Beranda</span>
            </Link>

            <button
              type="button"
              className={styles.flashTriggerBtn}
              onClick={handleTriggerFlash}
              title="Coba efek flash kamera!"
            >
              <CameraIcon size={16} />
              <span>Jepret Flash ✨</span>
            </button>
          </div>

          {/* Quick Links for Common Templates */}
          <div className={styles.quickLinksBox}>
            <span className={styles.quickLinksTitle}>Atau eksplor template terpopuler:</span>
            <div className={styles.quickPills}>
              <Link href="/booth/kuro-classic-dark" className={styles.quickPill}>
                <span>🌑 Kuro Dark Luxury</span>
              </Link>
              <Link href="/booth/korean-clean-beige" className={styles.quickPill}>
                <span>🤍 Korean Clean</span>
              </Link>
              <Link href="/booth/vintage-film-retro" className={styles.quickPill}>
                <span>🎞️ Vintage Film</span>
              </Link>
              <Link href="/booth/cherry-blossom-pink" className={styles.quickPill}>
                <span>🌸 Floral Blossom</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
