'use client'

import Link from 'next/link'
import {
  CameraIcon,
  PaletteIcon,
  HeartIcon,
  WandIcon,
  QrCodeIcon,
  LockIcon,
  SparklesIcon,
  PrinterIcon,
} from '@/components/Icons'
import Mascot from './Mascot'
import styles from './Footer.module.css'

interface Props {
  onSelectCategory?: (cat: string) => void
  onOpenCreator?: () => void
  onOpenLookup?: () => void
}

export default function Footer({ onSelectCategory, onOpenCreator, onOpenLookup }: Props) {

  function handleCategory(cat: string) {
    onSelectCategory?.(cat)
    const elem = document.getElementById('templates')
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          {/* Brand & Mascot Greeting */}
          <div className={styles.brandCol}>
            <div className={styles.brandWrap}>
              <div className={styles.brandIconWrap}>
                <CameraIcon size={20} strokeWidth={2.4} />
              </div>
              <span className={styles.brandName}>KuroBooth Studio</span>
            </div>
            <p className={styles.brandDesc}>
              Platform photobooth modern dengan template estetik strip 2×6 inch. Ambil foto otomatis dengan hitung mundur, cetak instan atau unduh via QR Code.
            </p>

            {/* Mascot Greeting Box */}
            <div className={styles.mascotCard}>
              <Mascot pose="happy" size={54} animated={false} />
              <div className={styles.mascotCardText}>
                <span className={styles.mascotTitle}>Hai dari Kuro!</span>
                <span className={styles.mascotSub}>Koleksi template baru selalu hadir setiap saat. Selamat berfoto!</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className={styles.colTitle}>Navigasi Cepat</h4>
            <ul className={styles.linkList}>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('Semua')}>
                  <PaletteIcon size={14} />
                  <span>Semua Template</span>
                </button>
              </li>
              <li>
                <Link href="/favorit" className={styles.linkItem}>
                  <HeartIcon size={14} />
                  <span>Koleksi Favorit</span>
                </Link>
              </li>
              <li>
                <Link href="/developer" className={styles.linkItem}>
                  <SparklesIcon size={14} />
                  <span>Tentang Developer</span>
                </Link>
              </li>
              {onOpenCreator && (
                <li>
                  <button className={styles.linkItem} onClick={onOpenCreator}>
                    <WandIcon size={14} />
                    <span>Sumbang Template</span>
                  </button>
                </li>
              )}
              {onOpenLookup && (
                <li>
                  <button className={styles.linkItem} onClick={onOpenLookup}>
                    <QrCodeIcon size={14} />
                    <span>Cek Foto Hasil QR</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Studio Specifications */}
          <div>
            <h4 className={styles.colTitle}>Spesifikasi Studio</h4>
            <ul className={styles.specList}>
              <li className={styles.specItem}>
                <span className={styles.specDot} />
                <span>Format Standar 2 × 6 Inch</span>
              </li>
              <li className={styles.specItem}>
                <span className={styles.specDot} />
                <span>Resolusi 300 DPI Siap Cetak</span>
              </li>
              <li className={styles.specItem}>
                <span className={styles.specDot} />
                <span>Hitung Mundur 3s Otomatis</span>
              </li>
              <li className={styles.specItem}>
                <span className={styles.specDot} />
                <span>Zoom &amp; Pan Posisi Wajah</span>
              </li>
              <li className={styles.specItem}>
                <span className={styles.specDot} />
                <span>Dukungan Frame PNG Canva</span>
              </li>
            </ul>
          </div>

          {/* Kategori Populer (Tanpa Emoji - Menggunakan SVG Icons) */}
          <div>
            <h4 className={styles.colTitle}>Kategori Populer</h4>
            <ul className={styles.linkList}>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('bunga')}>
                  <SparklesIcon size={14} />
                  <span>Sakura &amp; Floral Bloom</span>
                </button>
              </li>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('superhero')}>
                  <CameraIcon size={14} />
                  <span>Comic Superhero Edition</span>
                </button>
              </li>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('korea')}>
                  <PaletteIcon size={14} />
                  <span>Haru Korean Life 4 Cuts</span>
                </button>
              </li>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('retro')}>
                  <PrinterIcon size={14} />
                  <span>35mm Analog Tokyo Film</span>
                </button>
              </li>
              <li>
                <button className={styles.linkItem} onClick={() => handleCategory('dark')}>
                  <SparklesIcon size={14} />
                  <span>Midnight Vogue &amp; Cyber Y2K</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Copyright & Discreet Admin Access */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            KuroBooth © {new Date().getFullYear()} — Dibuat untuk mengabadikan momen berhargamu.
          </p>

          {/* Discreet Admin Studio Trigger */}
          <Link
            href="/admin"
            className={styles.adminSecretLink}
            title="Akses Admin Portal Studio"
          >
            <LockIcon size={12} />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
