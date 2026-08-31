'use client'

import { useState } from 'react'
import Mascot, { MascotPose } from './Mascot'
import { CloseIcon } from './Icons'
import styles from './FloatingMascotAssistant.module.css'

interface Props {
  tipText: string
  pose?: MascotPose
  title?: string
  hasBottomNav?: boolean
}

export default function FloatingMascotAssistant({
  tipText,
  pose = 'happy',
  title = 'Tips Kuro',
  hasBottomNav = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={`${styles.floatingContainer} ${hasBottomNav ? styles.withBottomNav : ''}`} aria-live="polite">
      {isOpen && (
        <div className={styles.bubbleWrap}>
          <div className={styles.bubbleHeader}>
            <span className={styles.bubbleTitle}>{title} ✨</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Tutup tips"
              title="Tutup tips"
            >
              <CloseIcon size={12} />
            </button>
          </div>
          <p className={styles.bubbleText}>{tipText}</p>
        </div>
      )}

      <button
        type="button"
        className={styles.mascotBtn}
        onClick={() => setIsOpen(prev => !prev)}
        title="Klik Kuro untuk tips!"
        aria-label="Klik Kuro Maskot untuk panduan"
      >
        <Mascot pose={pose} size={48} animated />
      </button>
    </div>
  )
}
