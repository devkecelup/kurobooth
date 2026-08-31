export type PhotoSlot = {
  x: number
  y: number
  width: number
  height: number
  borderRadius?: number
}

export type Decoration = {
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
}

export type ApiTemplate = {
  id: string
  name: string
  description: string
  photoCount: number
  stripWidth: number
  stripHeight: number
  backgroundColor: string
  accentColor: string
  textColor: string
  frameImageUrl?: string
  frameMode?: 'overlay' | 'background'
  slots: PhotoSlot[]
  decorations?: Decoration[]
  tags: string[]
  printSize: '2x6' | '4x6'
  // DB fields
  createdAt?: string
  isActive?: boolean
}

/** Fetch all active templates from the API */
export async function fetchTemplates(): Promise<ApiTemplate[]> {
  try {
    const res = await fetch('/api/templates', { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.templates as ApiTemplate[]
  } catch (err) {
    console.warn('fetchTemplates failed, using fallback:', err)
    return []
  }
}

/** Fetch a single template by ID from the API */
export async function fetchTemplate(id: string): Promise<ApiTemplate | null> {
  try {
    const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.template as ApiTemplate
  } catch {
    return null
  }
}