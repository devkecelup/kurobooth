export type PhotoSlot = {
  id: number
  aspectRatio: number // width/height
}

export type TemplateConfig = {
  id: string
  name: string
  description: string
  photoCount: number
  stripWidth: number  // pixels
  stripHeight: number
  backgroundColor: string
  accentColor: string
  textColor: string
  frameImageUrl?: string // Canva frame PNG URL or Base64
  frameMode?: 'overlay' | 'background' // 'overlay' frames over photos, 'background' sits below
  slots: {
    x: number
    y: number
    width: number
    height: number
    borderRadius?: number
  }[]
  decorations?: {
    type: 'text' | 'rect' | 'circle' | 'line' | 'svg'
    path?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    scale?: number
    x?: number
    y?: number
    width?: number
    height?: number
    text?: string
    fontSize?: number
    fontFamily?: string
    color?: string
    opacity?: number
  }[]
  tags: string[]
  printSize: '2x6' | '4x6'
  isActive?: boolean
  createdAt?: string
}

// 2x6 strip standard (600x1800 at 300dpi)
const STRIP_W = 600
const STRIP_H = 1800
const PHOTO_W = 520
const PHOTO_H = 360
const PHOTO_X = 40

// 4-Slot Standard Strip Layout
const SLOTS_4 = [
  { x: PHOTO_X, y: 60,   width: PHOTO_W, height: PHOTO_H, borderRadius: 8 },
  { x: PHOTO_X, y: 450,  width: PHOTO_W, height: PHOTO_H, borderRadius: 8 },
  { x: PHOTO_X, y: 840,  width: PHOTO_W, height: PHOTO_H, borderRadius: 8 },
  { x: PHOTO_X, y: 1230, width: PHOTO_W, height: PHOTO_H, borderRadius: 8 },
]

// 3-Slot Tall Strip Layout
const SLOTS_3 = [
  { x: PHOTO_X, y: 70,   width: PHOTO_W, height: 450, borderRadius: 12 },
  { x: PHOTO_X, y: 560,  width: PHOTO_W, height: 450, borderRadius: 12 },
  { x: PHOTO_X, y: 1050, width: PHOTO_W, height: 450, borderRadius: 12 },
]

// Common SVG Paths for Vector Decorations
const SVG_SPARKLE = 'M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z'
const SVG_FLOWER_5 = 'M12 2C13.5 6 17 6.5 17 8C17 9.5 15.5 10 14 10C16 12 16 15 14.5 16C13 17 12 15 12 13C12 15 11 17 9.5 16C8 15 8 12 10 10C8.5 10 7 9.5 7 8C7 6.5 10.5 6 12 2Z'
const SVG_FLOWER_DAISY = 'M12 4C10 1 6 2 6 6C6 8 8 10 12 12C8 14 6 16 6 18C6 22 10 23 12 20C14 23 18 22 18 18C18 16 16 14 12 12C16 10 18 8 18 6C18 2 14 1 12 4Z'
const SVG_SUPERMAN_SHIELD = 'M24 4 L44 14 L36 40 L24 50 L12 40 L4 14 Z'
const SVG_SUPERMAN_S = 'M24 12 L34 12 L34 20 L24 24 L16 28 L16 38 L34 38 L34 44 L14 44 L14 34 L24 30 L32 26 L32 18 L24 18 Z'
const SVG_FILM_ICON = 'M4 8 H20 V20 H4 Z M8 4 H16 V8 H8 Z'

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'forest-minimalist',
    name: 'Forest Minimalist',
    description: 'Aksen hijau tua luxury dengan typography elegan',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F8FAF8',
    accentColor: '#0D3B24',
    textColor: '#0C1E14',
    slots: SLOTS_4,
    decorations: [
      { type: 'svg', path: SVG_SPARKLE, fill: '#0D3B24', x: 288, y: 1630, scale: 1, opacity: 0.9 },
      { type: 'rect', x: 200, y: 1665, width: 200, height: 1.5, color: '#0D3B24', opacity: 0.8 },
      { type: 'text', x: 300, y: 1700, text: 'STUDIO MEMORIES', fontSize: 16, fontFamily: 'Playfair Display, serif', color: '#0D3B24', opacity: 0.95 },
      { type: 'text', x: 300, y: 1735, text: new Date().getFullYear().toString() + ' — LIMITED EDITION', fontSize: 12, fontFamily: 'sans-serif', color: '#6B8574', opacity: 0.8 },
    ],
    tags: ['minimalis', 'hijau', 'luxury', 'clean'],
    printSize: '2x6',
  },
  {
    id: 'superman-hero',
    name: 'Superman Hero Edition',
    description: 'Edisi superhero Man of Steel dengan badge diamond emblem dan nuansa komik berani',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#0B1B3D',
    accentColor: '#E02424',
    textColor: '#FFFFFF',
    slots: [
      { x: PHOTO_X, y: 55,  width: PHOTO_W, height: PHOTO_H, borderRadius: 4 },
      { x: PHOTO_X, y: 445, width: PHOTO_W, height: PHOTO_H, borderRadius: 4 },
      { x: PHOTO_X, y: 835, width: PHOTO_W, height: PHOTO_H, borderRadius: 4 },
      { x: PHOTO_X, y: 1225, width: PHOTO_W, height: PHOTO_H, borderRadius: 4 },
    ],
    decorations: [
      { type: 'rect', x: 0, y: 1620, width: STRIP_W, height: 180, color: '#061026', opacity: 1 },
      { type: 'svg', path: SVG_SUPERMAN_SHIELD, fill: '#FFD700', stroke: '#E02424', strokeWidth: 3, x: 276, y: 1635, scale: 1 },
      { type: 'svg', path: SVG_SUPERMAN_S, fill: '#E02424', x: 276, y: 1635, scale: 0.95 },
      { type: 'text', x: 300, y: 1715, text: 'SUPER PHOTOBOOTH', fontSize: 20, fontFamily: 'Impact, sans-serif', color: '#FFD700', opacity: 1 },
      { type: 'text', x: 300, y: 1750, text: 'MAN OF STEEL EDITION', fontSize: 11, fontFamily: 'monospace', color: '#FFFFFF', opacity: 0.9 },
    ],
    tags: ['superhero', 'comic', 'dark', 'action'],
    printSize: '2x6',
  },
  {
    id: 'sakura-floral',
    name: 'Sakura Floral Bloom',
    description: 'Ornamen bunga sakura mekar dengan palet blush pink yang manis',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#FDF2F4',
    accentColor: '#F472B6',
    textColor: '#831843',
    slots: [
      { x: PHOTO_X, y: 60,   width: PHOTO_W, height: PHOTO_H, borderRadius: 14 },
      { x: PHOTO_X, y: 450,  width: PHOTO_W, height: PHOTO_H, borderRadius: 14 },
      { x: PHOTO_X, y: 840,  width: PHOTO_W, height: PHOTO_H, borderRadius: 14 },
      { x: PHOTO_X, y: 1230, width: PHOTO_W, height: PHOTO_H, borderRadius: 14 },
    ],
    decorations: [
      { type: 'svg', path: SVG_FLOWER_5, fill: '#EC4899', x: 288, y: 1625, scale: 1.1, opacity: 0.9 },
      { type: 'text', x: 300, y: 1680, text: 'SAKURA BLOSSOM', fontSize: 17, fontFamily: 'Playfair Display, serif', color: '#9D174D', opacity: 0.95 },
      { type: 'text', x: 300, y: 1720, text: 'blooming in love — spring moment', fontSize: 13, fontFamily: 'serif', color: '#BE185D', opacity: 0.8 },
    ],
    tags: ['bunga', 'pink', 'sakura', 'aesthetic', 'soft'],
    printSize: '2x6',
  },
  {
    id: 'botanical-garden',
    name: 'Botanical Flora Garden',
    description: 'Estetika dedaunan dan bunga liar sage green dengan ketenangan alami',
    photoCount: 3,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F3F6F3',
    accentColor: '#4A6B53',
    textColor: '#1A3322',
    slots: SLOTS_3,
    decorations: [
      { type: 'svg', path: SVG_FLOWER_DAISY, fill: '#4A6B53', x: 288, y: 1575, scale: 1.1, opacity: 0.9 },
      { type: 'rect', x: 180, y: 1620, width: 240, height: 1.5, color: '#4A6B53', opacity: 0.6 },
      { type: 'text', x: 300, y: 1660, text: 'BOTANICAL GARDEN', fontSize: 17, fontFamily: 'Playfair Display, serif', color: '#1A3322', opacity: 0.95 },
      { type: 'text', x: 300, y: 1700, text: 'natural flora & wild flowers', fontSize: 13, fontFamily: 'serif', color: '#4A6B53', opacity: 0.85 },
    ],
    tags: ['bunga', 'minimalis', 'hijau', 'korea'],
    printSize: '2x6',
  },
  {
    id: 'sunflower-meadow',
    name: 'Sunflower Golden Meadow',
    description: 'Sentuhan ceria bunga matahari bernuansa kuning madu hangat',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#FFFDF0',
    accentColor: '#F59E0B',
    textColor: '#78350F',
    slots: SLOTS_4,
    decorations: [
      { type: 'svg', path: SVG_FLOWER_DAISY, fill: '#D97706', x: 288, y: 1625, scale: 1.2, opacity: 0.95 },
      { type: 'text', x: 300, y: 1680, text: 'SUNFLOWER MEMORIES', fontSize: 17, fontFamily: 'Playfair Display, serif', color: '#92400E', opacity: 0.95 },
      { type: 'text', x: 300, y: 1720, text: 'stay bright like a sunflower', fontSize: 13, fontFamily: 'serif', color: '#B45309', opacity: 0.8 },
    ],
    tags: ['bunga', 'aesthetic', 'warm', 'gold'],
    printSize: '2x6',
  },
  {
    id: 'classic-white',
    name: 'Classic White Studio',
    description: 'Minimalis modern dengan border putih bersih dan serif tipis',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#FFFFFF',
    accentColor: '#E2E8E4',
    textColor: '#1E2923',
    slots: SLOTS_4,
    decorations: [
      { type: 'text', x: 300, y: 1675, text: '— MEMORIES —', fontSize: 18, fontFamily: 'Playfair Display, Georgia, serif', color: '#0D3B24', opacity: 0.9 },
      { type: 'text', x: 300, y: 1715, text: 'PHOTOBOOTH ARCHIVE', fontSize: 11, fontFamily: 'monospace', color: '#82998A', opacity: 0.8 },
    ],
    tags: ['minimalis', 'putih', 'studio', 'editorial'],
    printSize: '2x6',
  },
  {
    id: 'deep-emerald',
    name: 'Deep Emerald Luxury',
    description: 'Palet hijau zamrud tua berkelas dengan aksen mint cerah',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#06190E',
    accentColor: '#10B981',
    textColor: '#FFFFFF',
    slots: SLOTS_4,
    decorations: [
      { type: 'svg', path: SVG_SPARKLE, fill: '#10B981', x: 288, y: 1630, scale: 1, opacity: 0.9 },
      { type: 'text', x: 300, y: 1680, text: 'FOREST CLUB', fontSize: 18, fontFamily: 'Playfair Display, serif', color: '#E8F5EE', opacity: 0.95 },
      { type: 'text', x: 300, y: 1715, text: 'AUTHENTIC MOMENTS', fontSize: 11, fontFamily: 'monospace', color: '#85B59A', opacity: 0.8 },
    ],
    tags: ['dark', 'hijau', 'luxury', 'emerald'],
    printSize: '2x6',
  },
  {
    id: 'midnight-vogue',
    name: 'Midnight Vogue',
    description: 'Monochrome hitam pekat gaya majalah editorial',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#0D0D0D',
    accentColor: '#333333',
    textColor: '#FFFFFF',
    slots: SLOTS_4,
    decorations: [
      { type: 'text', x: 300, y: 1670, text: 'V O G U E', fontSize: 24, fontFamily: 'Playfair Display, serif', color: '#FFFFFF', opacity: 1 },
      { type: 'text', x: 300, y: 1715, text: 'EXCLUSIVE EDITION ' + new Date().getFullYear(), fontSize: 10, fontFamily: 'sans-serif', color: '#888888', opacity: 0.8 },
    ],
    tags: ['dark', 'monochrome', 'vogue', 'editorial'],
    printSize: '2x6',
  },
  {
    id: 'matcha-editorial',
    name: 'Matcha Minimalist',
    description: 'Sentuhan warna matcha sage yang menenangkan',
    photoCount: 3,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F0F5F1',
    accentColor: '#6B9075',
    textColor: '#1A3824',
    slots: SLOTS_3,
    decorations: [
      { type: 'rect', x: 180, y: 1580, width: 240, height: 1.5, color: '#6B9075', opacity: 0.6 },
      { type: 'text', x: 300, y: 1630, text: 'MATCHA ARCHIVE', fontSize: 18, fontFamily: 'Playfair Display, serif', color: '#1A3824', opacity: 0.95 },
      { type: 'text', x: 300, y: 1670, text: 'calm & beautiful', fontSize: 14, fontFamily: 'serif', color: '#52755C', opacity: 0.8 },
    ],
    tags: ['minimalis', 'matcha', 'sage', 'korea'],
    printSize: '2x6',
  },
  {
    id: 'tokyo-35mm',
    name: 'Tokyo 35mm Analog',
    description: 'Format film analog 35mm Jepang bernuansa hangat',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F4F0E6',
    accentColor: '#8C7456',
    textColor: '#33271A',
    slots: [
      { x: PHOTO_X + 10, y: 80,   width: PHOTO_W - 20, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X + 10, y: 468,  width: PHOTO_W - 20, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X + 10, y: 856,  width: PHOTO_W - 20, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X + 10, y: 1244, width: PHOTO_W - 20, height: PHOTO_H, borderRadius: 0 },
    ],
    decorations: [
      { type: 'rect', x: 0, y: 1640, width: STRIP_W, height: 160, color: '#2B2014', opacity: 1 },
      { type: 'svg', path: SVG_FILM_ICON, fill: '#E8BF60', x: 288, y: 1655, scale: 1 },
      { type: 'text', x: 300, y: 1700, text: 'FUJIFILM 400', fontSize: 16, fontFamily: 'monospace', color: '#E8BF60', opacity: 1 },
      { type: 'text', x: 300, y: 1735, text: 'ISO 400 — 35MM FILM', fontSize: 11, fontFamily: 'monospace', color: '#D4AA4A', opacity: 0.8 },
    ],
    tags: ['retro', 'film', 'analog', 'tokyo'],
    printSize: '2x6',
  },
  {
    id: 'haru-korean',
    name: 'Haru Korean Studio',
    description: 'Estetika Life Four Cuts Korea dengan rounded corners lembut',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F7F8FA',
    accentColor: '#CBD5E1',
    textColor: '#1E293B',
    slots: [
      { x: PHOTO_X, y: 60,   width: PHOTO_W, height: PHOTO_H, borderRadius: 16 },
      { x: PHOTO_X, y: 450,  width: PHOTO_W, height: PHOTO_H, borderRadius: 16 },
      { x: PHOTO_X, y: 840,  width: PHOTO_W, height: PHOTO_H, borderRadius: 16 },
      { x: PHOTO_X, y: 1230, width: PHOTO_W, height: PHOTO_H, borderRadius: 16 },
    ],
    decorations: [
      { type: 'text', x: 300, y: 1675, text: 'HARU FILM STUDIO', fontSize: 16, fontFamily: 'sans-serif', color: '#334155', opacity: 0.9 },
      { type: 'text', x: 300, y: 1715, text: 'LIFE FOUR CUTS — SEOUL', fontSize: 11, fontFamily: 'sans-serif', color: '#94A3B8', opacity: 0.8 },
    ],
    tags: ['korea', 'pastel', 'minimalis', 'clean'],
    printSize: '2x6',
  },
  {
    id: 'nordic-editorial',
    name: 'Nordic Clean Swiss',
    description: 'Desain Swiss grid presisi tinggi dengan tipografi bold',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F8F9FA',
    accentColor: '#1E293B',
    textColor: '#0F172A',
    slots: [
      { x: PHOTO_X, y: 60,   width: PHOTO_W, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X, y: 450,  width: PHOTO_W, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X, y: 840,  width: PHOTO_W, height: PHOTO_H, borderRadius: 0 },
      { x: PHOTO_X, y: 1230, width: PHOTO_W, height: PHOTO_H, borderRadius: 0 },
    ],
    decorations: [
      { type: 'rect', x: 40, y: 1640, width: 520, height: 2, color: '#0F172A', opacity: 1 },
      { type: 'text', x: 300, y: 1685, text: 'HELVETICA STUDIO 01', fontSize: 15, fontFamily: 'sans-serif', color: '#0F172A', opacity: 1 },
      { type: 'text', x: 300, y: 1720, text: 'TYPOGRAPHIC ARCHIVE — SWITZERLAND', fontSize: 10, fontFamily: 'monospace', color: '#64748B', opacity: 0.9 },
    ],
    tags: ['editorial', 'swiss', 'minimalis', 'typography'],
    printSize: '2x6',
  },
  {
    id: 'cyber-y2k',
    name: 'Cyber Y2K Pop',
    description: 'Nuansa futuristik modern Y2K dengan aksen cyan & chrome',
    photoCount: 4,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#090B10',
    accentColor: '#00F0FF',
    textColor: '#FFFFFF',
    slots: SLOTS_4,
    decorations: [
      { type: 'rect', x: 0, y: 1640, width: STRIP_W, height: 3, color: '#00F0FF', opacity: 0.9 },
      { type: 'svg', path: SVG_SPARKLE, fill: '#00F0FF', x: 288, y: 1650, scale: 1 },
      { type: 'text', x: 300, y: 1695, text: 'CYBER PHOTOBOOTH 2000', fontSize: 16, fontFamily: 'monospace', color: '#00F0FF', opacity: 1 },
      { type: 'text', x: 300, y: 1730, text: 'DIGITAL MEMORY ARCHIVE', fontSize: 10, fontFamily: 'sans-serif', color: '#708090', opacity: 0.8 },
    ],
    tags: ['neon', 'y2k', 'cyber', 'dark'],
    printSize: '2x6',
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Editorial',
    description: 'Palet ungu pastel lembut dengan atmosfer dreamscape',
    photoCount: 3,
    stripWidth: STRIP_W,
    stripHeight: STRIP_H,
    backgroundColor: '#F5F3FF',
    accentColor: '#C4B5FD',
    textColor: '#4C1D95',
    slots: SLOTS_3,
    decorations: [
      { type: 'svg', path: SVG_SPARKLE, fill: '#8B5CF6', x: 288, y: 1575, scale: 1 },
      { type: 'text', x: 300, y: 1625, text: 'LAVENDER DREAMS', fontSize: 18, fontFamily: 'Playfair Display, serif', color: '#5B21B6', opacity: 0.9 },
      { type: 'text', x: 300, y: 1670, text: 'sweet memories forever', fontSize: 13, fontFamily: 'serif', color: '#8B5CF6', opacity: 0.8 },
    ],
    tags: ['pastel', 'lavender', 'aesthetic', 'bunga'],
    printSize: '2x6',
  },
]

export function getTemplate(id: string): TemplateConfig | undefined {
  return TEMPLATES.find(t => t.id === id)
}