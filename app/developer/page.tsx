'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Footer from '@/components/Footer'
import Mascot, { MascotPose } from '@/components/Mascot'
import CreatorModal from '@/components/CreatorModal'
import LookupModal from '@/components/LookupModal'
import FloatingMascotAssistant from '@/components/FloatingMascotAssistant'
import {
  PaletteIcon,
  WandIcon,
  SparklesIcon,
} from '@/components/Icons'
import styles from './page.module.css'

export default function DeveloperPage() {
  const router = useRouter()
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [mascotPose, setMascotPose] = useState<MascotPose>('artist')

  function cycleMascot() {
    const poses: MascotPose[] = ['artist', 'happy', 'camera', 'sparkle', 'waving']
    const nextIdx = (poses.indexOf(mascotPose) + 1) % poses.length
    setMascotPose(poses[nextIdx])
  }

  return (
    <div className={styles.page}>
      {/* Background ambient glows */}
      <div className={styles.bgGlow1} aria-hidden />
      <div className={styles.bgGlow2} aria-hidden />

      {/* Top Navbar */}
      <Navbar
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      <main className={styles.mainContent}>
        <div className={styles.containerBox}>
          {/* Master Profile Card */}
          <div className={styles.profileCard}>
            {/* 1. Header Profile Identity with Kurokii Photo */}
            <div className={styles.profileHeader}>
              <div className={styles.profileUserGroup}>
                <div className={styles.avatarWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://i.postimg.cc/4nkym5TP/ab8d6e845dc86f3f887fb1255d80a2d1.jpg"
                    alt="Foto Profil Kurokii"
                    className={styles.profileImg}
                    loading="lazy"
                  />
                  <span className={styles.avatarStatusDot} />
                </div>
                <div className={styles.profileMeta}>
                  <h1 className={styles.profileName}>Kurokii</h1>
                  <span className={styles.profileRole}>Developer &amp; Creator KuroBooth</span>
                </div>
              </div>

              <div className={styles.statusBadge}>
                <span>🟢 Vibe Coding</span>
              </div>
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerDot}>✦</span>
            </div>

            {/* 2. Story / Vibe Coding Terminal Card */}
            <div className={styles.storyBox}>
              <div className={styles.storyHeader}>
                <div className={styles.storyDots}>
                  <span className={styles.dotRed} />
                  <span className={styles.dotYellow} />
                  <span className={styles.dotGreen} />
                </div>
                <span className={styles.storyTitle}>kurokii@vibe-coding:~$ cat story.md</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>TypeScript</span>
              </div>
              <div className={styles.storyBody}>
                <p>
                  Saya <strong>Kurokii</strong>, developer pemula. Website ini saya bangun pakai{' '}
                  <strong>TypeScript</strong> — sebagian besar lewat proses <em>vibe coding</em>, alias
                  ngetik prompt, lihat hasilnya, terus utak-atik sampai jalan.
                </p>
                <p>
                  Saya masih belajar banyak hal di balik layar, tapi justru dari situ saya jadi paham
                  alur kerja developer sungguhan.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerDot}>✦</span>
            </div>

            {/* 3. AI Superfriends Section (Official Logos) */}
            <div className={styles.aiSection}>
              <div className={styles.sectionTitle}>
                <SparklesIcon size={14} />
                <span>Dibantu oleh AI Superfriends</span>
              </div>

              <div className={styles.aiCardsGrid}>
                {/* Claude */}
                <div className={`${styles.aiCard} ${styles.aiCardClaude}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/claude.svg"
                    alt="Claude AI Logo"
                    className={styles.aiImgLogo}
                  />
                  <div className={styles.aiInfo}>
                    <span className={styles.aiName}>Claude</span>
                    <span className={styles.aiRole}>Anthropic AI</span>
                  </div>
                </div>

                {/* Gemini */}
                <div className={`${styles.aiCard} ${styles.aiCardGemini}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/gemini.svg"
                    alt="Google Gemini AI Logo"
                    className={styles.aiImgLogo}
                  />
                  <div className={styles.aiInfo}>
                    <span className={styles.aiName}>Gemini</span>
                    <span className={styles.aiRole}>Google DeepMind AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerDot}>✦</span>
            </div>

            {/* 4. Tech Stack (TypeScript & React JSX) */}
            <div className={styles.techSection}>
              <div className={styles.sectionTitle}>
                <span>Bahasa &amp; Framework</span>
              </div>

              <div className={styles.techCardsGrid}>
                {/* TypeScript */}
                <div className={styles.techCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/typescript.svg"
                    alt="TypeScript Logo"
                    className={styles.techImgLogo}
                  />
                  <div className={styles.techInfo}>
                    <span className={styles.techName}>TypeScript</span>
                    <span className={styles.techRole}>Bahasa Utama</span>
                  </div>
                </div>

                {/* React JSX */}
                <div className={styles.techCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/react.svg"
                    alt="React JSX Logo"
                    className={styles.techImgLogo}
                  />
                  <div className={styles.techInfo}>
                    <span className={styles.techName}>React JSX</span>
                    <span className={styles.techRole}>Next.js App Router</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerDot}>✦</span>
            </div>

            {/* 5. Interactive Mascot Kuro Card */}
            <div className={styles.mascotCard} onClick={cycleMascot}>
              <div className={styles.mascotTextCol}>
                <span className={styles.mascotHeading}>
                  <SparklesIcon size={14} />
                  <span>Kuro si Maskot:</span>
                </span>
                <span className={styles.mascotQuote}>
                  {mascotPose === 'artist'
                    ? '“Kurokii sang vibe coder yang bikin aku lho! Keren kan? 🎨✨”'
                    : mascotPose === 'happy'
                    ? '“Kolaborasi manusia & AI melahirkan KuroBooth! 🎉”'
                    : mascotPose === 'camera'
                    ? '“Yuk jepret momen terbaikmu bareng Kuro! 📸”'
                    : mascotPose === 'sparkle'
                    ? '“Kualitas cetak strip 300 DPI dijamin estetik! 🌟”'
                    : '“Klik aku lagi buat lihat pose lainnya! ✨”'}
                </span>
                <span className={styles.mascotHint}>👉 Klik Kuro untuk ganti pose</span>
              </div>
              <Mascot pose={mascotPose} size="sm" animated />
            </div>

            {/* 6. Action Buttons */}
            <div className={styles.actionRow}>
              <Link href="/" className={styles.btnActionPrimary}>
                <PaletteIcon size={17} />
                <span>Mulai Berfoto Sekarang</span>
              </Link>
              <button
                className={styles.btnActionSecondary}
                onClick={() => setIsCreatorOpen(true)}
              >
                <WandIcon size={17} />
                <span>+ Sumbang Frame Canva</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        onSelectGallery={() => router.push('/')}
        onSelectFavorites={() => router.push('/favorit')}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Footer */}
      <Footer
        onSelectCategory={() => router.push('/')}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Creator Modal */}
      <CreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
      />

      {/* Lookup Modal */}
      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />

      {/* Floating Interactive Mascot */}
      <FloatingMascotAssistant
        tipText="Yuk kenalan sama Kurokii! Geser aku keliling profil yaa ✨"
        pose="artist"
        title="Halo dari Kuro!"
      />
    </div>
  )
}
