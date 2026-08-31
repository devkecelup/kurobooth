'use client'

import React from 'react'

export type MascotPose = 'waving' | 'camera' | 'sparkle' | 'artist' | 'searching' | 'happy' | 'lost'

interface MascotProps {
  pose?: MascotPose
  size?: number | 'sm' | 'md' | 'lg' | 'hero'
  className?: string
  animated?: boolean
  showSpeech?: boolean
  speechText?: string
  onClick?: () => void
}

export default function Mascot({
  pose = 'waving',
  size = 'md',
  className = '',
  animated = true,
  showSpeech = false,
  speechText,
  onClick,
}: MascotProps) {
  let pixelSize = 120
  if (typeof size === 'number') {
    pixelSize = size
  } else {
    switch (size) {
      case 'sm': pixelSize = 48; break
      case 'md': pixelSize = 96; break
      case 'lg': pixelSize = 160; break
      case 'hero': pixelSize = 220; break
    }
  }

  const defaultSpeech: Record<MascotPose, string> = {
    waving: 'Hai! Yuk abadikan momen terbaikmu! ✨',
    camera: 'Siap? 3... 2... 1... Senyum! 📸',
    sparkle: 'Wah, hasil fotomu estetik banget! 🌟',
    artist: 'Ayo bikin template Canva kreasimu! 🎨',
    searching: 'Mencari template yang pas buat kamu... 🔍',
    happy: 'Cetak langsung atau simpan via QR! 🎉',
    lost: 'Oops! Halaman ini gak ada di album foto Kuro... 🧭',
  }

  const speech = speechText || defaultSpeech[pose] || defaultSpeech.waving

  return (
    <div
      className={`mascot-container ${animated ? 'mascot-animated' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`Maskot KuroBooth pose ${pose}`}
    >
      {/* Speech Bubble */}
      {showSpeech && (
        <div
          className="mascot-speech-bubble"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #DFE8E1',
            borderRadius: '16px',
            padding: '8px 14px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            color: '#0D3B24',
            boxShadow: '0 4px 16px rgba(13, 59, 36, 0.08)',
            marginBottom: '8px',
            maxWidth: '220px',
            textAlign: 'center',
            position: 'relative',
            animation: 'mascotFloat 3s ease-in-out infinite',
            lineHeight: 1.35,
          }}
        >
          {speech}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              background: '#FFFFFF',
              borderRight: '1.5px solid #DFE8E1',
              borderBottom: '1.5px solid #DFE8E1',
            }}
          />
        </div>
      )}

      {/* SVG Mascot Art */}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-svg"
        style={{
          filter: 'drop-shadow(0 8px 18px rgba(13, 59, 36, 0.12))',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="bodyGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0D3B24" />
            <stop offset="100%" stopColor="#145333" />
          </linearGradient>

          <linearGradient id="bellyGrad" x1="50" y1="70" x2="150" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EBF4EE" />
          </linearGradient>

          <linearGradient id="lensGrad" x1="70" y1="70" x2="130" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1A2D22" />
            <stop offset="50%" stopColor="#0D1E15" />
            <stop offset="100%" stopColor="#040D08" />
          </linearGradient>

          <linearGradient id="lensRingGrad" x1="60" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFDF73" />
            <stop offset="100%" stopColor="#E5A910" />
          </linearGradient>

          <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <radialGradient id="blushGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FF7A8A" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FF7A8A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- SHADOW --- */}
        <ellipse cx="100" cy="184" rx="55" ry="10" fill="#0C1E14" fillOpacity="0.14" />

        {/* --- MAIN BODY (Rounded Camera Bot) --- */}
        {/* Ears / Side Dials */}
        <rect x="30" y="55" width="16" height="30" rx="8" fill="#145333" />
        <rect x="154" y="55" width="16" height="30" rx="8" fill="#145333" />
        <circle cx="38" cy="70" r="4" fill="#FFDF73" />
        <circle cx="162" cy="70" r="4" fill="#FFDF73" />

        {/* Antenna / Flash Bulb on Top */}
        <path d="M100 42 V26" stroke="#0D3B24" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="22" r="9" fill="url(#goldGrad)" />
        <circle cx="98" cy="20" r="3" fill="#FFFFFF" fillOpacity="0.8" />
        {/* Flash Sparkles */}
        <path d="M116 16 L122 10 M84 16 L78 10 M100 8 V2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />

        {/* Main Body Chassis */}
        <rect x="36" y="38" width="128" height="130" rx="42" fill="url(#bodyGrad)" />
        <rect x="40" y="42" width="120" height="122" rx="38" stroke="#25724A" strokeWidth="2" fill="none" opacity="0.6" />

        {/* Top Viewfinder Bar */}
        <rect x="62" y="46" width="76" height="14" rx="7" fill="#072014" />
        <rect x="66" y="49" width="22" height="8" rx="4" fill="#2CE88C" opacity="0.9" />
        <circle cx="128" cy="53" r="3.5" fill="#EF4444" />

        {/* White Belly Screen / Face Plate */}
        <rect x="48" y="66" width="104" height="92" rx="28" fill="url(#bellyGrad)" />

        {/* Rosy Cheeks */}
        <ellipse cx="64" cy="116" rx="9" ry="6" fill="url(#blushGlow)" />
        <ellipse cx="136" cy="116" rx="9" ry="6" fill="url(#blushGlow)" />

        {/* --- EYES & FACE DEPENDING ON POSE --- */}
        {pose === 'camera' ? (
          /* Wink & Camera Lens Eye */
          <g>
            {/* Left Eye: Happy Arc */}
            <path d="M60 102 Q67 94 74 102" stroke="#0D3B24" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Right Eye: Round Lens */}
            <circle cx="126" cy="100" r="11" fill="#0D3B24" />
            <circle cx="129" cy="97" r="4" fill="#FFFFFF" />
          </g>
        ) : pose === 'sparkle' || pose === 'happy' ? (
          /* Joyful Closed Eyes */
          <g>
            <path d="M60 102 Q67 92 74 102" stroke="#0D3B24" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M126 102 Q133 92 140 102" stroke="#0D3B24" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </g>
        ) : pose === 'searching' ? (
          /* Curious Big Eyes */
          <g>
            <circle cx="68" cy="98" r="9" fill="#0D3B24" />
            <circle cx="66" cy="95" r="3.5" fill="#FFFFFF" />
            <circle cx="132" cy="98" r="9" fill="#0D3B24" />
            <circle cx="130" cy="95" r="3.5" fill="#FFFFFF" />
          </g>
        ) : pose === 'lost' ? (
          /* Confused / Surprised Eyes with Sweatdrop & Tilted Eyebrows */
          <g>
            {/* Left Eye: Big Round Wonder */}
            <circle cx="68" cy="98" r="9" fill="#0D3B24" />
            <circle cx="66" cy="95" r="3.5" fill="#FFFFFF" />
            <path d="M60 87 Q68 84 76 89" stroke="#0D3B24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Right Eye: Spiral / Questioning Arc */}
            <circle cx="132" cy="98" r="9" fill="#0D3B24" />
            <circle cx="134" cy="95" r="3.5" fill="#FFFFFF" />
            <path d="M124 89 Q132 84 140 87" stroke="#0D3B24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Cute Blue Sweat Drop */}
            <path d="M148 76 C148 76 154 84 154 88 A4 4 0 1 1 146 88 C146 84 148 76 148 76 Z" fill="#38BDF8" />
          </g>
        ) : (
          /* Standard Happy Big Eyes with Shine */
          <g>
            <circle cx="68" cy="98" r="8.5" fill="#0D3B24" />
            <circle cx="70" cy="95" r="3.5" fill="#FFFFFF" />
            <circle cx="66" cy="101" r="1.5" fill="#FFFFFF" />

            <circle cx="132" cy="98" r="8.5" fill="#0D3B24" />
            <circle cx="134" cy="95" r="3.5" fill="#FFFFFF" />
            <circle cx="130" cy="101" r="1.5" fill="#FFFFFF" />
          </g>
        )}

        {/* Cute Smile / Puzzled Mouth */}
        {pose === 'lost' ? (
          <path d="M92 115 Q96 110 100 115 Q104 120 108 115" stroke="#0D3B24" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M92 112 Q100 122 108 112" stroke="#0D3B24" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        )}

        {/* Center Camera Lens (The Core Heart of Kuro) */}
        <circle cx="100" cy="138" r="17" fill="url(#lensRingGrad)" />
        <circle cx="100" cy="138" r="13.5" fill="url(#lensGrad)" />
        {/* Lens Glass Reflection */}
        <path d="M94 130 A10 10 0 0 1 106 130" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="104" cy="142" r="2" fill="#FFFFFF" opacity="0.7" />

        {/* --- HANDS & ACCESSORIES PER POSE --- */}
        {pose === 'waving' && (
          <g>
            {/* Left Hand: Down */}
            <path d="M42 120 C30 128 32 146 44 148" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="36" cy="144" r="8" fill="#FFDF73" />

            {/* Right Hand: Waving High */}
            <path d="M158 110 C175 92 182 72 174 62" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="174" cy="60" r="9" fill="#FFDF73" />
            {/* Waving motion lines */}
            <path d="M188 50 Q192 60 188 70 M194 54 Q198 60 194 66" stroke="#165B38" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {pose === 'camera' && (
          <g>
            {/* Mini Rangefinder Camera in Hands */}
            <rect x="68" y="142" width="64" height="38" rx="8" fill="#1E293B" stroke="#FFDF73" strokeWidth="2.5" />
            <circle cx="100" cy="161" r="11" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="100" cy="161" r="4" fill="#38BDF8" />
            <rect x="76" y="136" width="14" height="6" rx="2" fill="#FFDF73" />
            {/* Cute hands gripping camera */}
            <circle cx="68" cy="158" r="8" fill="#FFDF73" />
            <circle cx="132" cy="158" r="8" fill="#FFDF73" />
          </g>
        )}

        {pose === 'sparkle' && (
          <g>
            {/* Holding a 2x6 Photo Strip */}
            <g transform="translate(142, 70) rotate(12)">
              <rect x="0" y="0" width="30" height="85" rx="4" fill="#FFFFFF" stroke="#0D3B24" strokeWidth="2" />
              <rect x="4" y="5" width="22" height="15" rx="2" fill="#0D3B24" />
              <rect x="4" y="24" width="22" height="15" rx="2" fill="#F472B6" />
              <rect x="4" y="43" width="22" height="15" rx="2" fill="#F59E0B" />
              <line x1="8" y1="68" x2="22" y2="68" stroke="#0D3B24" strokeWidth="2" />
              <line x1="10" y1="74" x2="20" y2="74" stroke="#85B59A" strokeWidth="1.5" />
            </g>
            {/* Hands holding it */}
            <circle cx="146" cy="120" r="8" fill="#FFDF73" />
            <circle cx="48" cy="128" r="8" fill="#FFDF73" />
            {/* Sparkles */}
            <path d="M30 70 L35 78 L43 80 L35 82 L30 90 L25 82 L17 80 L25 78 Z" fill="#F59E0B" />
            <path d="M175 35 L178 40 L183 42 L178 44 L175 49 L172 44 L167 42 L172 40 Z" fill="#F59E0B" />
          </g>
        )}

        {pose === 'artist' && (
          <g>
            {/* Left Hand: Holding Palette */}
            <ellipse cx="40" cy="136" rx="16" ry="12" fill="#F4F0E6" stroke="#8C7456" strokeWidth="2" />
            <circle cx="34" cy="132" r="3" fill="#EC4899" />
            <circle cx="44" cy="130" r="3" fill="#38BDF8" />
            <circle cx="48" cy="138" r="3" fill="#10B981" />
            <circle cx="36" cy="142" r="3" fill="#F59E0B" />
            <circle cx="40" cy="136" r="7" fill="#FFDF73" />

            {/* Right Hand: Paintbrush */}
            <path d="M156 120 L176 96" stroke="#8C7456" strokeWidth="5" strokeLinecap="round" />
            <path d="M176 96 L184 86" stroke="#0D3B24" strokeWidth="4" strokeLinecap="round" />
            <circle cx="184" cy="85" r="4" fill="#EC4899" />
            <circle cx="156" cy="120" r="8" fill="#FFDF73" />
          </g>
        )}

        {pose === 'searching' && (
          <g>
            {/* Left Hand */}
            <circle cx="46" cy="132" r="8" fill="#FFDF73" />
            {/* Right Hand: Magnifying Glass */}
            <circle cx="145" cy="98" r="18" fill="#E0F2FE" fillOpacity="0.7" stroke="#0D3B24" strokeWidth="4" />
            <path d="M158 111 L175 128" stroke="#8C7456" strokeWidth="7" strokeLinecap="round" />
            <circle cx="158" cy="116" r="8" fill="#FFDF73" />
          </g>
        )}

        {pose === 'happy' && (
          <g>
            {/* Cheerful Hands in the Air */}
            <path d="M42 110 C28 96 22 76 32 68" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="32" cy="66" r="8" fill="#FFDF73" />

            <path d="M158 110 C172 96 178 76 168 68" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="168" cy="66" r="8" fill="#FFDF73" />

            {/* Confetti */}
            <rect x="22" y="35" width="6" height="6" rx="2" fill="#EC4899" transform="rotate(25 22 35)" />
            <rect x="172" y="30" width="7" height="7" rx="2" fill="#38BDF8" transform="rotate(-15 172 30)" />
            <circle cx="98" cy="10" r="3" fill="#F59E0B" />
          </g>
        )}

        {pose === 'lost' && (
          <g>
            {/* Left Hand Scratching Head / Antenna */}
            <path d="M42 120 C24 96 46 64 68 50" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="68" cy="48" r="8" fill="#FFDF73" />

            {/* Right Hand Holding Polaroid with ? */}
            <path d="M156 122 C168 128 166 144 154 148" stroke="#0D3B24" strokeWidth="9" strokeLinecap="round" fill="none" />
            <g transform="translate(138, 92) rotate(-8)">
              <rect x="0" y="0" width="36" height="46" rx="4" fill="#FFFFFF" stroke="#0D3B24" strokeWidth="2.5" />
              <rect x="4" y="4" width="28" height="26" rx="2" fill="#EBF4EE" />
              <text x="18" y="23" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#0D3B24" fontFamily="Poppins, sans-serif">?</text>
              <line x1="6" y1="36" x2="30" y2="36" stroke="#85B59A" strokeWidth="2" strokeLinecap="round" />
            </g>
            <circle cx="152" cy="140" r="8" fill="#FFDF73" />

            {/* Floating Question Marks */}
            <text x="178" y="62" fontSize="20" fontWeight="800" fill="#F59E0B" fontFamily="Poppins, sans-serif">?</text>
            <text x="24" y="52" fontSize="15" fontWeight="800" fill="#F59E0B" fontFamily="Poppins, sans-serif">?</text>
          </g>
        )}
      </svg>
    </div>
  )
}
