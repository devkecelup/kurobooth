'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Mascot, { MascotPose } from './Mascot'
import { CloseIcon } from './Icons'
import styles from './FloatingMascotAssistant.module.css'

interface Props {
  tipText?: string
  pose?: MascotPose
  title?: string
  hasBottomNav?: boolean
}

const DRAG_POSES: MascotPose[] = [
  'searching',
  'lost',
  'camera',
  'sparkle',
  'artist',
  'happy',
  'waving',
]

const DRAG_QUOTES = [
  'Wuuuush! Meluncur! 🚀',
  'Eeeh kemana kita?! 🧭',
  'Waaa serunya terbang! 💨',
  'Ganti gaya dulu cekrek! 📸',
  'Wiiih asik dipindah-pindah! ✨',
  'Awas nabrak layar! 😆',
  'Cari spot foto terbaik! 🔍',
  'Yeaaay pose baru! 🌟',
  'Jangan dilempar yaa! 🎈',
  'Halo dari atas sini! 👋',
]

const LANDING_QUOTES = [
  'Mendarat dengan mulus! 🌟',
  'Spot baru yang asyik! ✨',
  'Siap temani kamu foto! 📸',
  'Ayo lanjut kreasikan foto cantik! 🎉',
  'Kuro mendarat dengan aman! 🚀',
]

const CLICK_FUN_FACTS = [
  'Tips: Geser dan zoom fotomu di preview agar pas di frame! 🔍',
  'Tarik aku keliling layar untuk lihat ekspresi lucuku! 🚀',
  'Kamu bisa bikin template Canva kreasimu di menu Sumbang Template! 🎨',
  'KuroBooth menyediakan ekspor HD 300 DPI siap cetak lho! 🖨️',
  'Sudah simpan template ke favorit belum? Klik ikon hati ya! ❤️',
  'Senyum terbaikmu adalah seni terindah hari ini! ✨',
]

const STORAGE_KEY = 'kurobooth_mascot_pos_v2'

export default function FloatingMascotAssistant({
  tipText = 'Hai! Aku Kuro, maskot setiamu. Coba seret aku ke mana aja! ✨',
  pose = 'happy',
  title = 'Tips Kuro',
  hasBottomNav = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true)
  const [currentPose, setCurrentPose] = useState<MascotPose>(pose)
  const [speechText, setSpeechText] = useState(tipText)
  const [speechTitle, setSpeechTitle] = useState(title)
  const [isDragging, setIsDragging] = useState(false)
  const [isLanded, setIsLanded] = useState(false)
  const [tilt, setTilt] = useState(0)

  // Position in viewport pixels
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const mascotBtnRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    lastX: 0,
    lastY: 0,
    totalDistance: 0,
    hasMoved: false,
    lastQuoteTime: 0,
    quoteIndex: 0,
  })

  // Sync external pose & tipText changes when not actively dragging
  useEffect(() => {
    if (!isDragging) {
      setCurrentPose(pose)
      setSpeechText(tipText)
      setSpeechTitle(title)
    }
  }, [pose, tipText, title, isDragging])

  // Initialize position on mount (load from storage or set safe default)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const computeInitialPos = () => {
      const padRight = 24
      const padBottom = hasBottomNav ? 90 : 28
      const defaultX = Math.max(16, window.innerWidth - 80 - padRight)
      const defaultY = Math.max(16, window.innerHeight - 80 - padBottom)

      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (
            typeof parsed.x === 'number' &&
            typeof parsed.y === 'number' &&
            parsed.x >= 0 &&
            parsed.x <= window.innerWidth - 60 &&
            parsed.y >= 0 &&
            parsed.y <= window.innerHeight - 60
          ) {
            return parsed
          }
        }
      } catch {}

      return { x: defaultX, y: defaultY }
    }

    setPosition(computeInitialPos())

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return computeInitialPos()
        const maxX = Math.max(16, window.innerWidth - 80)
        const maxY = Math.max(16, window.innerHeight - 80)
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        }
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hasBottomNav])

  // Clamp coordinates within viewport
  const clampPos = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y }
    const size = 68
    const minX = 12
    const maxX = Math.max(minX, window.innerWidth - size - 12)
    const minY = 12
    const maxY = Math.max(minY, window.innerHeight - size - 12)
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    }
  }, [])

  // Pointer Down - start listening to drag
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary button
    if (e.button !== 0) return

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}

    const curX = position ? position.x : window.innerWidth - 100
    const curY = position ? position.y : window.innerHeight - 100

    dragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: curX,
      initY: curY,
      lastX: e.clientX,
      lastY: e.clientY,
      totalDistance: 0,
      hasMoved: false,
      lastQuoteTime: 0,
      quoteIndex: Math.floor(Math.random() * DRAG_QUOTES.length),
    }
  }

  // Pointer Move - perform drag & emotion cycling
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDown) return

    const { startX, startY, initX, initY, lastX } = dragRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const stepDist = Math.hypot(e.clientX - lastX, e.clientY - dragRef.current.lastY)

    dragRef.current.totalDistance += stepDist
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY

    // Threshold check (5px) to differentiate click vs drag
    if (!dragRef.current.hasMoved && dragRef.current.totalDistance > 6) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
      setIsOpen(true)
      setSpeechTitle('Kuro Terbang! 💨')
      // Ubah emosi/pose 1x saja saat mulai terbang
      const flightPoses: MascotPose[] = ['searching', 'lost', 'sparkle', 'happy']
      const randomFlightPose = flightPoses[Math.floor(Math.random() * flightPoses.length)]
      setCurrentPose(randomFlightPose)

      // Set teks terbang awal
      setSpeechText(DRAG_QUOTES[dragRef.current.quoteIndex])
      dragRef.current.lastQuoteTime = Date.now()
    }

    if (dragRef.current.hasMoved) {
      const rawX = initX + dx
      const rawY = initY + dy
      const clamped = clampPos(rawX, rawY)
      setPosition(clamped)

      // Calculate tilt based on drag direction / speed
      const moveDeltaX = e.clientX - lastX
      const targetTilt = Math.max(-22, Math.min(22, moveDeltaX * 2.5))
      setTilt(targetTilt)

      // Ganti teks dengan santai (jeda minimal 2.2 detik sekali agar nyaman dibaca)
      const now = Date.now()
      if (now - dragRef.current.lastQuoteTime > 2200) {
        dragRef.current.quoteIndex = (dragRef.current.quoteIndex + 1) % DRAG_QUOTES.length
        setSpeechText(DRAG_QUOTES[dragRef.current.quoteIndex])
        dragRef.current.lastQuoteTime = now
      }
    }
  }

  // Pointer Up - drop or click
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDown) return

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    const wasDragging = dragRef.current.hasMoved
    dragRef.current.isDown = false
    setIsDragging(false)
    setTilt(0)

    if (wasDragging) {
      // Landed animation & pose
      setIsLanded(true)
      setCurrentPose('happy')
      const randLanding = LANDING_QUOTES[Math.floor(Math.random() * LANDING_QUOTES.length)]
      setSpeechTitle('Horeee! 🎉')
      setSpeechText(randLanding)
      setIsOpen(true)

      // Save position
      if (position) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position))
        } catch {}
      }

      // Reset landing effect and return to normal idle pose after 2.8s
      setTimeout(() => {
        setIsLanded(false)
        setCurrentPose(pose)
        setSpeechTitle(title)
        setSpeechText(tipText)
      }, 2800)
    } else {
      // Simple click/tap interaction: cycle random fun facts and change pose!
      const randomFact = CLICK_FUN_FACTS[Math.floor(Math.random() * CLICK_FUN_FACTS.length)]
      const poses: MascotPose[] = ['camera', 'sparkle', 'happy', 'waving', 'artist']
      const randomPose = poses[Math.floor(Math.random() * poses.length)]

      setCurrentPose(randomPose)
      setSpeechTitle('Tips Kuro ✨')
      setSpeechText(randomFact)
      setIsOpen((prev) => !prev)

      setTimeout(() => {
        setCurrentPose(pose)
      }, 2000)
    }
  }

  // If position is not ready yet, render offscreen/hidden
  if (!position) return null

  // Determine speech bubble orientation so it NEVER clips outside screen bounds
  const isNearRight = typeof window !== 'undefined' ? position.x > window.innerWidth / 2 : true
  const isNearBottom = typeof window !== 'undefined' ? position.y > window.innerHeight / 2 : true

  return (
    <aside
      ref={containerRef}
      className={`${styles.floatingMascotWrapper} ${isDragging ? styles.isDragging : ''} ${
        isLanded ? styles.isLanded : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      aria-label="Maskot interaktif Kuro"
    >
      {/* Dynamic Speech Bubble */}
      {isOpen && (
        <div
          className={`${styles.bubbleWrap} ${
            isNearRight ? styles.bubbleLeft : styles.bubbleRight
          } ${isNearBottom ? styles.bubbleAbove : styles.bubbleBelow}`}
          role="region"
          aria-live="polite"
        >
          <div className={styles.bubbleHeader}>
            <span className={styles.bubbleTitle}>{speechTitle}</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              aria-label="Tutup pesan maskot"
              title="Tutup pesan"
            >
              <CloseIcon size={12} />
            </button>
          </div>
          <p className={styles.bubbleText}>{speechText}</p>
        </div>
      )}

      {/* Draggable Mascot Button */}
      <button
        ref={mascotBtnRef}
        type="button"
        className={styles.mascotDraggableBtn}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `rotate(${tilt}deg) scale(${isDragging ? 1.15 : isLanded ? 1.1 : 1})`,
        }}
        title="Geser aku ke mana saja! Atau klik untuk tips & emosiku ✨"
        aria-label="Geser maskot Kuro"
      >
        <div className={styles.mascotArtWrap}>
          <Mascot pose={currentPose} size={54} animated={!isDragging} />
        </div>

        {/* Floating pulse indicator when idle */}
        {!isDragging && (
          <span className={styles.dragBadge} title="Bisa digeser!">
            ✨
          </span>
        )}
      </button>
    </aside>
  )
}
