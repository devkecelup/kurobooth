'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  CameraIcon,
  SparklesIcon,
  PrinterIcon,
  QrCodeIcon,
  CloudIcon,
  PaletteIcon,
  ArrowRightIcon,
  SlidersIcon,
  HeartIcon,
  HeartFilledIcon,
  WandIcon,
  SearchIcon,
  CloseIcon,
  MenuIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@/components/Icons'
import styles from './page.module.css'

const CATEGORY_ITEMS = [
  { id: 'Semua', label: 'Semua Template', icon: '🌟' },
  { id: 'bunga', label: 'Bunga & Floral', icon: '🌸' },
  { id: 'superhero', label: 'Superhero', icon: '🦸' },
  { id: 'minimalis', label: 'Minimalis Clean', icon: '🤍' },
  { id: 'dark', label: 'Dark Luxury', icon: '🌑' },
  { id: 'korea', label: 'Korean Style', icon: '🇰🇷' },
  { id: 'aesthetic', label: 'Aesthetic Pastel', icon: '✨' },
  { id: 'retro', label: 'Vintage Retro Film', icon: '🎞️' },
]

export default function HomePage() {
  const router = useRouter()
  const [activeTag, setActiveTag] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TemplateConfig[]>(TEMPLATES)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [heroMascotPose, setHeroMascotPose] = useState<MascotPose>('waving')

  // Reset page when category or search changes
  useEffect(() => {
    // Use startTransition-friendly functional form to avoid cascading re-renders
    const timer = setTimeout(() => setCurrentPage(1), 0)
    return () => clearTimeout(timer)
  }, [activeTag, searchQuery])

  // Load favorites from LocalStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('kurobooth_favorites')
        if (saved) {
          setFavorites(JSON.parse(saved))
        }
      } catch {
        // LocalStorage not accessible
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Close category dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('#category-dropdown-container')) {
        setIsCategoryOpen(false)
      }
    }
    if (isCategoryOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isCategoryOpen])

  // Background fetch to sync DB / Custom templates with safe cold-start timeout and auto-retry
  const loadDbTemplates = useCallback(async (isRetry = false) => {
    const controller = new AbortController()
    // 7 seconds timeout: safe for Supabase cold-start without keeping user waiting too long
    const timeout = setTimeout(() => controller.abort(), 7000)
    try {
      const res = await fetch('/api/templates', { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const data = await res.json()
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates)
        }
      } else if (!isRetry) {
        setTimeout(() => loadDbTemplates(true), 1000)
        return
      }
    } catch {
      clearTimeout(timeout)
      if (!isRetry) {
        setTimeout(() => loadDbTemplates(true), 1000)
        return
      }
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [])

  // Auto-fetch on mount and auto-refresh whenever templates are added, approved, edited, or deleted
  useEffect(() => {
    loadDbTemplates()
    window.addEventListener('kurobooth:templates-updated', () => loadDbTemplates(false))
    return () => {
      window.removeEventListener('kurobooth:templates-updated', () => loadDbTemplates(false))
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

  function handleAddCustomTemplate(customTemplate: TemplateConfig) {
    if (customTemplate.isActive) {
      setTemplates(prev => [customTemplate, ...prev.filter(t => t.id !== customTemplate.id)])
    }
    loadDbTemplates()
  }

  function handleSelect(template: TemplateConfig) {
    router.push(`/booth/${template.id}`)
  }

  function cycleHeroMascot() {
    const poses: MascotPose[] = ['waving', 'camera', 'sparkle', 'artist', 'happy']
    const nextIdx = (poses.indexOf(heroMascotPose) + 1) % poses.length
    setHeroMascotPose(poses[nextIdx])
  }

  // Filter templates by active category and search query
  const filtered = templates.filter(t => {
    // Never show unapproved or pending templates to public users
    if (t.isActive === false) return false

    // 1. Category filter
    if (activeTag !== 'Semua') {
      if (!t.tags || !t.tags.includes(activeTag)) return false
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = t.name.toLowerCase().includes(q)
      const matchDesc = (t.description || '').toLowerCase().includes(q)
      const matchTags = t.tags?.some(tag => tag.toLowerCase().includes(q))
      return matchName || matchDesc || matchTags
    }

    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const paginatedTemplates = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    const elem = document.getElementById('templates')
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      {/* Ambient background glows */}
      <div className={styles.bgGlow1} aria-hidden />
      <div className={styles.bgGlow2} aria-hidden />

      {/* Modern Glassmorphic Top Navbar */}
      <Navbar
        activeCategory={activeTag}
        onSelectCategory={setActiveTag}
        favoriteCount={favorites.length}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Hero Section with Interactive Mascot */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            {/* Left Content */}
            <div className={styles.heroContent}>
              <h1 className={`heading-xl text-gradient animate-fade-in ${styles.heroTitle}`}>
                KuroBooth Studio<br />
                <em>Estetik &amp; Menyenangkan</em>
              </h1>
              <p className={`animate-fade-in delay-100 ${styles.heroDesc}`}>
                Pilih template strip foto favoritmu, ambil foto langsung dengan hitung mundur otomatis,
                sesuaikan posisi wajah, lalu cetak instan atau unduh melalui QR Code di ponselmu.
              </p>
              <div className={`flex items-center gap-3 animate-fade-in delay-200 ${styles.heroFeatures}`}>
                <span className={styles.featureTag}>
                  <CameraIcon size={15} />
                  <span>Kamera &amp; Upload</span>
                </span>
                <span className={styles.featureTag}>
                  <PrinterIcon size={15} />
                  <span>Format 2×6 300 DPI</span>
                </span>
                <span className={styles.featureTag}>
                  <QrCodeIcon size={15} />
                  <span>Share QR Code</span>
                </span>
                <span className={styles.featureTag}>
                  <CloudIcon size={15} />
                  <span>Canva Frame Ready</span>
                </span>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    const elem = document.getElementById('templates')
                    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <PaletteIcon size={18} />
                  <span>Pilih Template Sekarang</span>
                </button>
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => setIsCreatorOpen(true)}
                >
                  <WandIcon size={18} />
                  <span>+ Sumbang Template</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Mascot Banner */}
            <div className={styles.heroMascotCol}>
              <div className={styles.mascotInteractiveWrap} onClick={cycleHeroMascot}>
                <Mascot
                  pose={heroMascotPose}
                  size="hero"
                  animated
                  showSpeech
                  speechText={
                    heroMascotPose === 'waving'
                      ? 'Hai! Klik aku untuk berganti pose! 📸'
                      : heroMascotPose === 'camera'
                      ? 'Senyum manisnya mana nih? ✨'
                      : heroMascotPose === 'sparkle'
                      ? 'Strip 2x6 fotomu pasti estetik! 🌟'
                      : heroMascotPose === 'artist'
                      ? 'Mau upload frame Canva kreasimu? 🎨'
                      : 'Yuk abadikan momen sekarang! 🎉'
                  }
                />
                <span className={styles.mascotHintBadge}>
                  <SparklesIcon size={12} />
                  <span>Klik Kuro si Maskot untuk Pose Baru</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Template Gallery Section */}
      <section className={styles.gallery} id="templates">
        <div className="container">
          <div className={styles.galleryHeader}>
            <div>
              <h2 className="heading-lg">Pilih Template Strip</h2>
              <p className={styles.gallerySubtitle}>
                {searchQuery
                  ? `Hasil pencarian untuk "${searchQuery}" (${filtered.length} template)`
                  : activeTag !== 'Semua'
                  ? `Kategori ${CATEGORY_ITEMS.find(c => c.id === activeTag)?.label || activeTag} (${filtered.length} template)`
                  : `${filtered.length} template estetik tersedia — pilih untuk mulai berfoto`}
              </p>
            </div>
          </div>

          {/* Controls: Search Bar (Row 1) & Category Burger Dropdown (Row 2) */}
          <div className={styles.controlsWrapper}>
            {/* 1. Dedicated Search Bar Row */}
            <div className={styles.searchRow}>
              <div className={styles.searchBox}>
                <SearchIcon size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Cari template foto (nama, bunga, superhero, dark, retro...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Cari template photobooth"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus kata kunci pencarian"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Burger Category Selector & Dropdown Menu */}
            <div className={styles.filterRow} id="category-dropdown-container">
              <button
                type="button"
                id="btn-category-burger"
                className={`${styles.burgerBtn} ${isCategoryOpen || activeTag !== 'Semua' ? styles.burgerBtnActive : ''}`}
                onClick={() => setIsCategoryOpen(prev => !prev)}
                aria-expanded={isCategoryOpen}
                aria-haspopup="true"
              >
                <div className={styles.burgerIconWrap}>
                  <MenuIcon size={18} strokeWidth={2.4} />
                </div>
                <span>
                  Kategori: {CATEGORY_ITEMS.find(c => c.id === activeTag)?.label || 'Semua'}
                </span>
                <ChevronDownIcon
                  size={16}
                  className={`${styles.chevronIcon} ${isCategoryOpen ? styles.chevronOpen : ''}`}
                />
              </button>

              {/* Active Category Indicator with Reset */}
              {activeTag !== 'Semua' && (
                <div className={styles.activeCategoryIndicator}>
                  <span>{CATEGORY_ITEMS.find(c => c.id === activeTag)?.icon} #{activeTag}</span>
                  <button
                    type="button"
                    className={styles.resetCategoryBtn}
                    onClick={() => setActiveTag('Semua')}
                    title="Reset kategori ke Semua"
                    aria-label="Reset kategori"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              )}

              {/* Downward Dropdown List */}
              {isCategoryOpen && (
                <div className={styles.categoryDropdown} role="menu">
                  <div className={styles.categoryDropdownHeader}>
                    <span>Pilih Kategori</span>
                    <button
                      type="button"
                      className={styles.resetCategoryBtn}
                      onClick={() => setIsCategoryOpen(false)}
                      aria-label="Tutup menu kategori"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>

                  <div className={styles.categoryGrid}>
                    {CATEGORY_ITEMS.map(cat => {
                      const isSelected = activeTag === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`${styles.categoryItem} ${isSelected ? styles.categoryItemActive : ''}`}
                          onClick={() => {
                            setActiveTag(cat.id)
                            setIsCategoryOpen(false)
                          }}
                          role="menuitem"
                        >
                          <div className={styles.categoryItemLeft}>
                            <span className={styles.categoryIconEmoji}>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </div>
                          {isSelected && (
                            <span className={styles.categoryCheckmark}>
                              <CheckIcon size={15} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template Grid */}
          <div className={styles.templateGrid}>
            {isLoadingTemplates && templates.length <= TEMPLATES.length ? (
              <div className={styles.mascotLoadingState}>
                <Mascot
                  pose="searching"
                  size="md"
                  animated
                  showSpeech
                  speechText="Menyiapkan template photobooth keren buat kamu... ✨"
                />
                <div className={styles.loadingBarWrap}>
                  <div className={styles.loadingBarInner} />
                </div>
                <p className={styles.loadingSubtext}>Menghubungkan ke studio template...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <Mascot pose="searching" size="md" />
                <h3 className={styles.emptyTitle}>Template Tidak Ditemukan</h3>
                <p className={styles.emptyDesc}>
                  {`Tidak ada template yang cocok dengan "${searchQuery}". Coba kata kunci lain atau sumbang template baru.`}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setActiveTag('Semua')
                      setSearchQuery('')
                    }}
                  >
                    <span>Lihat Semua Template</span>
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsCreatorOpen(true)}
                  >
                    <WandIcon size={14} />
                    <span>Sumbang Template</span>
                  </button>
                </div>
              </div>
            ) : (
              paginatedTemplates.map((template, i) => {
                const isFav = favorites.includes(template.id)
                return (
                  <div
                    key={template.id}
                    className={`${styles.templateCard} animate-fade-in`}
                    style={{ animationDelay: `${(i % 9) * 40}ms` }}
                    onMouseEnter={() => setHovered(template.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Floating Heart / Favorite Button */}
                    <button
                      id={`fav-btn-${template.id}`}
                      className={`${styles.favButton} ${isFav ? styles.favButtonActive : ''}`}
                      onClick={(e) => toggleFavorite(template.id, e)}
                      title={isFav ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                      aria-label={`Favorite template ${template.name}`}
                    >
                      {isFav ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}
                    </button>

                    {/* Preview Canvas with IntersectionObserver Lazy Loading */}
                    <div className={styles.previewWrapper}>
                      <TemplatePreview
                        template={template}
                        isHovered={hovered === template.id}
                        priority={i < 3}
                      />
                      <div className={`${styles.previewOverlay} ${hovered === template.id ? styles.previewOverlayVisible : ''}`}>
                        <button
                          id={`select-template-${template.id}`}
                          className="btn btn-primary btn-lg"
                          onClick={() => handleSelect(template)}
                        >
                          <span>Gunakan Template</span>
                          <ArrowRightIcon size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className={styles.templateInfo}>
                      <div className={styles.templateInfoTop}>
                        <h3 className="heading-md">{template.name}</h3>
                        <span className={styles.photoCount}>
                          {template.photoCount} foto
                        </span>
                      </div>
                      <p className={styles.templateDesc}>
                        {template.description?.trim() || 'Karya Kreator Komunitas'}
                      </p>
                      <div className={styles.templateTags}>
                        {template.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className={styles.templateTag}>#{tag}</span>
                        ))}
                      </div>
                      {/* Mobile CTA */}
                      <button
                        id={`select-template-mobile-${template.id}`}
                        className={`btn btn-primary w-full ${styles.mobileCta}`}
                        onClick={() => handleSelect(template)}
                      >
                        <span>Gunakan Template</span>
                        <ArrowRightIcon size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination Controls */}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className={styles.paginationWrap}>
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.paginationNavBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeftIcon size={16} />
                  <span>Sebelumnya</span>
                </button>

                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      className={`${styles.pageNumberBtn} ${currentPage === page ? styles.pageNumberBtnActive : ''}`}
                      onClick={() => handlePageChange(page)}
                      aria-label={`Ke halaman ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.paginationNavBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Halaman selanjutnya"
                >
                  <span>Selanjutnya</span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>

              <span className={styles.paginationInfo}>
                Halaman {currentPage} dari {totalPages} (Total {filtered.length} template)
              </span>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className="container">
          <div className={styles.howTitleWrap}>
            <div className="badge badge-accent">
              <SparklesIcon size={13} />
              <span>Langkah Praktis</span>
            </div>
            <h2 className={`heading-lg text-center ${styles.howTitle}`}>Cara Berfoto di KuroBooth</h2>
          </div>
          <div className={styles.stepsGrid}>
            {[
              {
                num: '01',
                IconComponent: PaletteIcon,
                title: 'Pilih Template Estetik',
                desc: 'Pilih salah satu dari beragam template strip foto minimalis dengan proporsi 2x6.',
              },
              {
                num: '02',
                IconComponent: CameraIcon,
                title: 'Ambil Foto Otomatis',
                desc: 'Nyalakan kamera atau upload foto. Hitung mundur 3 detik akan mempermudah persiapan pose.',
              },
              {
                num: '03',
                IconComponent: SlidersIcon,
                title: 'Pas-kan Posisi Wajah',
                desc: 'Zoom dan geser posisi wajah langsung di foto agar pas presisi di dalam frame strip.',
              },
              {
                num: '04',
                IconComponent: PrinterIcon,
                title: 'Cetak & Simpan QR',
                desc: 'Cetak strip foto secara langsung atau scan QR Code untuk mengunduh hasilnya di HP.',
              },
            ].map((step, i) => (
              <div key={step.num} className={`${styles.stepCard} animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNum}>{step.num}</span>
                  <div className={styles.stepIconWrap}>
                    <step.IconComponent size={20} className={styles.stepSvg} />
                  </div>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rich Footer with Mascot & Navigation */}
      <Footer
        onSelectCategory={setActiveTag}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeCategory={activeTag}
        favoriteCount={favorites.length}
        onSelectGallery={() => {
          setActiveTag('Semua')
          const elem = document.getElementById('templates')
          if (elem) elem.scrollIntoView({ behavior: 'smooth' })
        }}
        onSelectFavorites={() => {
          setActiveTag('Favorit')
          const elem = document.getElementById('templates')
          if (elem) elem.scrollIntoView({ behavior: 'smooth' })
        }}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenLookup={() => setIsLookupOpen(true)}
      />

      {/* Floating Mascot Assistant with Contextual Guidance */}
      <FloatingMascotAssistant
        tipText={
          activeTag === 'Favorit'
            ? 'Koleksi template favoritmu ada di sini! ❤️'
            : searchQuery.trim()
            ? `Menemukan ${templates.length} template yang cocok dengan pencarianmu! 🔍`
            : 'Pilih template favoritmu lalu klik untuk mulai berfoto! 📸'
        }
        pose={
          activeTag === 'Favorit'
            ? 'sparkle'
            : searchQuery.trim()
            ? 'searching'
            : 'waving'
        }
        hasBottomNav={true}
        title="Tips Kuro"
      />

      {/* Modals */}
      <CreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onAddCustomTemplate={handleAddCustomTemplate}
      />

      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />
    </div>
  )
}