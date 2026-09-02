'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  HeartIcon,
  HeartFilledIcon,
  PaletteIcon,
  QrCodeIcon,
  WandIcon,
  CodeIcon,
} from '@/components/Icons'
import Mascot from './Mascot'
import styles from './Navbar.module.css'

interface Props {
  activeCategory?: string
  onSelectCategory?: (cat: string) => void
  favoriteCount?: number
  onOpenCreator?: () => void
  onOpenLookup?: () => void
}

export default function Navbar({
  onSelectCategory,
  onOpenCreator,
  onOpenLookup,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  const isFavoritPage = pathname === '/favorit'
  const isHomePage = pathname === '/'
  const isDevPage = pathname === '/developer'

  function handleLogoClick() {
    if (pathname !== '/') {
      router.push('/')
    } else {
      onSelectCategory?.('Semua')
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  function handleScrollToTemplates() {
    if (pathname !== '/') {
      router.push('/')
    } else {
      onSelectCategory?.('Semua')
      const elem = document.getElementById('templates')
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  function handleFavoriteTab() {
    router.push('/favorit')
  }

  return (
    <header className={styles.navbar}>
      <div className="container">
        <div className={styles.navbarInner}>
          {/* Logo & Mascot */}
          <div
            className={styles.brand}
            onClick={handleLogoClick}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <div className={styles.logoBadge}>
              <Mascot
                pose={isLogoHovered ? 'happy' : 'camera'}
                size={34}
                animated={false}
              />
            </div>
            <div className={styles.brandInfo}>
              <span className={styles.brandTitle}>
                KuroBooth
                <span className={styles.brandPill}>Studio</span>
              </span>
              <span className={styles.brandTagline}>Photobooth Strip 2x6 Instant</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className={styles.navLinks} aria-label="Navigasi Utama">
            {/* 1. Pilih Template */}
            <button
              id="nav-pilih-template"
              className={`${styles.navBtn} ${isHomePage ? styles.navBtnActive : ''}`}
              onClick={handleScrollToTemplates}
            >
              <PaletteIcon size={16} />
              <span>Pilih Template</span>
            </button>

            {/* 2. Favorite Template */}
            <button
              id="nav-favorit-template"
              className={`${styles.navBtn} ${isFavoritPage ? styles.navBtnActive : ''}`}
              onClick={handleFavoriteTab}
              aria-label="Halaman Koleksi Favorit"
            >
              {isFavoritPage ? (
                <HeartFilledIcon size={16} />
              ) : (
                <HeartIcon size={16} />
              )}
              <span>Favorit</span>
            </button>

            {/* 3. Sumbang / Kreator Template */}
            {onOpenCreator && (
              <button
                id="nav-kreator"
                className={`${styles.navBtn} ${styles.creatorBtn}`}
                onClick={onOpenCreator}
              >
                <WandIcon size={16} />
                <span>Sumbang Template</span>
              </button>
            )}

            {/* 4. Cek Hasil Sesi QR */}
            {onOpenLookup && (
              <button
                id="nav-lookup"
                className={styles.navBtn}
                onClick={onOpenLookup}
                title="Cari foto hasil sesi menggunakan Share Code"
              >
                <QrCodeIcon size={16} />
                <span>Cek Foto</span>
              </button>
            )}

            {/* 5. Developer Profile */}
            <Link
              href="/developer"
              id="nav-developer"
              className={`${styles.navBtn} ${isDevPage ? styles.navBtnActive : ''}`}
              title="Tentang Developer KuroBooth"
            >
              <CodeIcon size={16} />
              <span>Developer</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
