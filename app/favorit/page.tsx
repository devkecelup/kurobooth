'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TEMPLATES, TemplateConfig } from '@/lib/templates'
import TemplatePreview from '@/components/TemplatePreview'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import Footer from '@/components/Footer'
import Mascot, { MascotPose } from '@/components/Mascot'
import FloatingMascotAssistant from '@/components/FloatingMascotAssistant'
import CreatorModal from '@/components/CreatorModal'
import LookupModal from '@/components/LookupModal'
import {
  HeartFilledIcon,
  HeartIcon,
  SearchIcon,
  CloseIcon,
  PaletteIcon,
  CameraIcon,
  SparklesIcon,
} from '@/components/Icons'
import styles from './page.module.css'

const TAG_FILTERS = ['Semua', 'bunga', 'superhero', 'minimalis', 'dark', 'korea', 'aesthetic', 'retro']

export default function FavoritPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<string[]>([])
  const [templates, setTemplates] = useState<TemplateConfig[]>(TEMPLATES)
  const [activeTag, setActiveTag] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [mascotPose, setMascotPose] = useState<MascotPose>('sparkle')

  // Load favorites from LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('kurobooth_favorites')
        if (saved) {
          setFavorites(JSON.parse(saved))
        }
      } catch {
        // LocalStorage not available
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Sync DB / custom templates
  const loadDbTemplates = useCallback(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const res = await fetch('/api/templates', { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates)
        }
      }
    } catch {
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    loadDbTemplates()
    window.addEventListener('kurobooth:templates-updated', loadDbTemplates)
    return () => {
      window.removeEventListener('kurobooth:templates-updated', loadDbTemplates)
    }
  }, [loadDbTemplates])

  function toggleFavorite(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      try {
        localStorage.setItem('kurobooth_favorites', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function handleSelectTemplate(template: TemplateConfig) {
    router.push(`/booth/${template.id}`)
  }

  function cycleMascot() {
    const poses: MascotPose[] = ['sparkle', 'happy', 'camera', 'waving']
    const nextIdx = (poses.indexOf(mascotPose) + 1) % poses.length
    setMascotPose(poses[nextIdx])
  }

  // Filter templates that are in favorites
  const favoriteTemplates = templates.filter(t => {
    if (t.isActive === false) return false
    return favorites.includes(t.id)
  })

  // Apply search and tag filtering to favorites
  const filteredFavorites = favoriteTemplates.filter(t => {
    // 1. Tag filter
    if (activeTag !== 'Semua') {
      if (!t.tags || !t.tags.includes(activeTag)) return false
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = t.name.toLowerCase().includes(q)
      const matchDesc = (t.description || '').toLowerCase().includes(q)
      const matchTags = t.tags?.some(tag => tag.toLowerCase().includes(q))
      return matchName || matchDesc || matchTags
    }

    return true
  })

  // Recommended templates (non-favorited templates)
  const recommendedTemplates = templates
    .filter(t => t.isActive !== false && !favorites.includes(t.id))
    .slice(0, 4)

  return (
    <div className={styles.page}>
      {/* Ambient background glows */}
      <div className={styles.bgGlow1} aria-hidden />
      <div className={styles.bgGlow2} aria-hidden />

      {/* Top Navbar */}
      <Navbar
        activeCategory="Favorit"
        favoriteCount={favorites.length}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      <main className={styles.mainContent}>
        <div className="container">
          {/* Hero Banner */}
          <section className={styles.hero}>
            <div className={styles.heroCard}>
              <div className={styles.heroInfo}>
                <div className={styles.heroBadge}>
                  <HeartFilledIcon size={14} />
                  <span>Koleksi Favorit</span>
                </div>
                <h1 className={styles.heroTitle}>
                  Template Favorit Kamu
                </h1>
                <p className={styles.heroSubtitle}>
                  {favorites.length > 0
                    ? `Kamu menyimpan ${favorites.length} template pilihan. Klik template kapan saja untuk langsung masuk ke bilik foto!`
                    : 'Belum ada template favorit yang disimpan. Simpan template yang kamu sukai agar mudah ditemukan!'}
                </p>
              </div>

              <div className={styles.heroMascotWrap} onClick={cycleMascot}>
                <Mascot
                  pose={mascotPose}
                  size="lg"
                  animated
                  showSpeech
                  speechText={
                    favorites.length > 0
                      ? 'Ini dia koleksi template favoritmu! ✨'
                      : 'Yuk cari template estetik yang kamu suka! 📸'
                  }
                />
              </div>
            </div>
          </section>

          {/* Controls Bar */}
          {favorites.length > 0 && (
            <div className={styles.controlsBar}>
              {/* Search in Favorites */}
              <div className={styles.searchBox}>
                <SearchIcon size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Cari dalam template favorit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Cari template favorit"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus kata kunci"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>

              {/* Tag Pills */}
              <div className={styles.filterTags}>
                {TAG_FILTERS.map(tag => {
                  const isActive = activeTag === tag
                  return (
                    <button
                      key={tag}
                      className={`${styles.filterTag} ${isActive ? styles.filterTagActive : ''}`}
                      onClick={() => setActiveTag(tag)}
                    >
                      {tag === 'Semua' ? 'Semua Kategori' : `#${tag}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Favorites Grid */}
          {filteredFavorites.length > 0 ? (
            <div className={styles.grid}>
              {filteredFavorites.map(t => (
                <div key={t.id} className={styles.templateCard}>
                  {/* Template Strip Preview */}
                  <div
                    className={styles.previewWrap}
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <TemplatePreview template={t} priority={true} />
                    <span className={styles.quickUseBadge}>
                      <CameraIcon size={14} />
                      <span>Gunakan Template</span>
                    </span>
                  </div>

                  {/* Card Info */}
                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>{t.name}</h3>
                      <button
                        type="button"
                        className={styles.unfavBtn}
                        onClick={(e) => toggleFavorite(t.id, e)}
                        title="Hapus dari favorit"
                        aria-label={`Hapus ${t.name} dari favorit`}
                      >
                        <HeartFilledIcon size={16} />
                      </button>
                    </div>

                    <p className={styles.cardDesc}>
                      {t.description || `${t.slots.length} foto strip format 2x6`}
                    </p>

                    {t.tags && t.tags.length > 0 && (
                      <div className={styles.cardTags}>
                        {t.tags.map(tag => (
                          <span key={tag} className={styles.tagPill}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      className={`btn btn-primary ${styles.useBtn}`}
                      onClick={() => handleSelectTemplate(t)}
                    >
                      <CameraIcon size={16} />
                      <span>Mulai Foto Sekarang</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className={styles.emptyState}>
              <Mascot pose="searching" size="hero" animated />
              <h2 className={styles.emptyTitle}>
                {searchQuery
                  ? `Tidak ada favorit yang cocok dengan "${searchQuery}"`
                  : 'Belum Ada Template Favorit'}
              </h2>
              <p className={styles.emptyDesc}>
                {searchQuery
                  ? 'Coba ganti kata kunci pencarian atau pilih kategori yang lain.'
                  : 'Jelajahi galeri template KuroBooth dan klik ikon hati ❤️ pada template yang kamu sukai untuk menyimpannya di sini!'}
              </p>
              <Link href="/" className="btn btn-primary btn-lg">
                <PaletteIcon size={18} />
                <span>Jelajahi Galeri Template</span>
              </Link>
            </div>
          )}

          {/* Recommended Templates Section */}
          {recommendedTemplates.length > 0 && (
            <section className={styles.recommendSection}>
              <div className={styles.recommendHeader}>
                <h2 className={styles.recommendTitle}>
                  <SparklesIcon size={20} />
                  <span>Rekomendasi Template Populer</span>
                </h2>
                <p className={styles.recommendSub}>
                  Tambahkan template keren ini ke daftar favoritmu dengan sekali klik!
                </p>
              </div>

              <div className={styles.grid}>
                {recommendedTemplates.map(t => (
                  <div key={t.id} className={styles.templateCard}>
                    <div
                      className={styles.previewWrap}
                      onClick={() => handleSelectTemplate(t)}
                    >
                      <TemplatePreview template={t} priority={false} />
                      <span className={styles.quickUseBadge}>
                        <CameraIcon size={14} />
                        <span>Gunakan Template</span>
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{t.name}</h3>
                        <button
                          type="button"
                          className={styles.unfavBtn}
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                          onClick={(e) => toggleFavorite(t.id, e)}
                          title="Tambah ke favorit"
                          aria-label={`Tambah ${t.name} ke favorit`}
                        >
                          <HeartIcon size={16} />
                        </button>
                      </div>

                      <p className={styles.cardDesc}>
                        {t.description || `${t.slots.length} foto strip format 2x6`}
                      </p>

                      <button
                        className={`btn btn-secondary ${styles.useBtn}`}
                        onClick={() => handleSelectTemplate(t)}
                      >
                        <CameraIcon size={16} />
                        <span>Mulai Foto</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Floating Mascot Assistant */}
      <FloatingMascotAssistant
        tipText={
          favorites.length > 0
            ? 'Klik template favoritmu untuk langsung membuka bilik foto! 📸'
            : 'Kamu belum punya template favorit, yuk eksplor template estetik kami! ✨'
        }
        pose={favorites.length > 0 ? 'sparkle' : 'searching'}
        hasBottomNav={true}
        title="Tips Favorit"
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeCategory="Favorit"
        favoriteCount={favorites.length}
        onSelectGallery={() => router.push('/')}
        onSelectFavorites={() => {}}
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
        onAddCustomTemplate={(custom) => {
          if (custom.isActive) {
            setTemplates(prev => [custom, ...prev])
          }
        }}
      />

      {/* Lookup Modal */}
      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />
    </div>
  )
}
