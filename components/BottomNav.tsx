'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  PaletteIcon,
  HeartIcon,
  HeartFilledIcon,
  WandIcon,
  QrCodeIcon,
  CodeIcon,
} from '@/components/Icons'
import styles from './BottomNav.module.css'

interface Props {
  activeCategory?: string
  favoriteCount?: number
  onSelectGallery?: () => void
  onSelectFavorites?: () => void
  onOpenCreator?: () => void
  onOpenLookup?: () => void
}

export default function BottomNav({
  onSelectGallery,
  onSelectFavorites,
  onOpenCreator,
  onOpenLookup,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const isFavoritPage = pathname === '/favorit'
  const isHomePage = pathname === '/'
  const isDevPage = pathname === '/developer'

  function handleGalleryClick() {
    if (pathname !== '/') {
      router.push('/')
    } else {
      onSelectGallery?.()
      const elem = document.getElementById('templates')
      if (elem) elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function handleFavoritesClick() {
    if (pathname !== '/favorit') {
      router.push('/favorit')
    } else {
      onSelectFavorites?.()
    }
  }

  function handleDevClick() {
    router.push('/developer')
  }

  return (
    <nav className={styles.bottomNav} aria-label="Navigasi Bawah Mobile">
      <div className={styles.bottomNavInner}>
        {/* 1. Beranda / Template */}
        <button
          id="mobile-nav-gallery"
          className={`${styles.navItem} ${isHomePage ? styles.navItemActive : ''}`}
          onClick={handleGalleryClick}
          aria-label="Pilih Template Beranda"
        >
          <div className={styles.iconWrapper}>
            <PaletteIcon size={19} strokeWidth={2.2} />
          </div>
          <span>Template</span>
          {isHomePage && <span className={styles.activeDot} />}
        </button>

        {/* 2. Favorit */}
        <button
          id="mobile-nav-favorites"
          className={`${styles.navItem} ${isFavoritPage ? styles.navItemActive : ''}`}
          onClick={handleFavoritesClick}
          aria-label="Halaman Koleksi Favorit"
        >
          <div className={styles.iconWrapper}>
            {isFavoritPage ? (
              <HeartFilledIcon size={19} />
            ) : (
              <HeartIcon size={19} strokeWidth={2.2} />
            )}
          </div>
          <span>Favorit</span>
          {isFavoritPage && <span className={styles.activeDot} />}
        </button>

        {/* 3. Sumbang Template (Center Elevated Floating Action) */}
        <button
          id="mobile-nav-creator"
          className={`${styles.navItem} ${styles.highlightItem}`}
          onClick={onOpenCreator}
          aria-label="Sumbang Template Custom atau Frame Canva"
        >
          <div className={`${styles.iconWrapper} ${styles.highlightIconWrapper}`}>
            <WandIcon size={20} strokeWidth={2.4} />
          </div>
          <span className={styles.highlightLabel}>Sumbang</span>
        </button>

        {/* 4. Cek Foto Sesi QR */}
        <button
          id="mobile-nav-lookup"
          className={styles.navItem}
          onClick={onOpenLookup}
          aria-label="Cek Foto Sesi via Kode Share"
        >
          <div className={styles.iconWrapper}>
            <QrCodeIcon size={18} strokeWidth={2.2} />
          </div>
          <span>Cek Foto</span>
        </button>

        {/* 5. Developer Hub */}
        <button
          id="mobile-nav-developer"
          className={`${styles.navItem} ${isDevPage ? styles.navItemActive : ''}`}
          onClick={handleDevClick}
          aria-label="Halaman Developer Kurokii"
        >
          <div className={styles.iconWrapper}>
            <CodeIcon size={19} strokeWidth={2.2} />
          </div>
          <span>Developer</span>
          {isDevPage && <span className={styles.activeDot} />}
        </button>
      </div>
    </nav>
  )
}

