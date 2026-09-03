import { NextRequest, NextResponse } from 'next/server'
import { TEMPLATES } from '@/lib/templates'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TB_API_KEY = process.env.TEMPLATESBOOTH_API_KEY ?? ''

function isSupabaseConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_URL.includes('your-project') &&
    !!SUPABASE_KEY &&
    !SUPABASE_KEY.includes('placeholder') &&
    !SUPABASE_KEY.includes('your-anon')
  )
}

function isAdmin(request: NextRequest): boolean {
  const secret = request.headers.get('x-admin-secret')
  return !ADMIN_SECRET || secret === ADMIN_SECRET
}

// Map TemplatesBooth format to our format
function mapTbTemplate(tbData: Record<string, unknown>) {
  const postUrl = typeof tbData.post_url === 'string' ? tbData.post_url : ''
  const slug = postUrl ? postUrl.split('/').filter(Boolean).pop() : 'tb-' + Math.random().toString(36).slice(2)
  const name = (slug as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const photoCount = parseInt(String(tbData.no_of_images || '4')) || 4
  const rawTags = Array.isArray(tbData.tags) ? tbData.tags : []
  const tags = rawTags.map((t: Record<string, unknown>) => t.slug)
  
  let slots = []
  if (tbData.layout_size === '26strip') {
    if (photoCount === 2) {
      slots = [
        { x: 40, y: 80, width: 520, height: 680, borderRadius: 14 },
        { x: 40, y: 820, width: 520, height: 680, borderRadius: 14 }
      ]
    } else if (photoCount === 3) {
      slots = [
        { x: 40, y: 70, width: 520, height: 450, borderRadius: 12 },
        { x: 40, y: 560, width: 520, height: 450, borderRadius: 12 },
        { x: 40, y: 1050, width: 520, height: 450, borderRadius: 12 }
      ]
    } else {
      slots = [
        { x: 40, y: 60, width: 520, height: 360, borderRadius: 8 },
        { x: 40, y: 450, width: 520, height: 360, borderRadius: 8 },
        { x: 40, y: 840, width: 520, height: 360, borderRadius: 8 },
        { x: 40, y: 1230, width: 520, height: 360, borderRadius: 8 }
      ]
    }
  } else if (tbData.layout_size === 'square') {
    slots = [
      { x: 40, y: 100, width: 245, height: 245, borderRadius: 8 },
      { x: 315, y: 100, width: 245, height: 245, borderRadius: 8 },
      { x: 40, y: 380, width: 245, height: 245, borderRadius: 8 },
      { x: 315, y: 380, width: 245, height: 245, borderRadius: 8 },
    ].slice(0, photoCount)
  } else {
    // Default 4 vertical
    slots = [
      { x: 40, y: 60, width: 520, height: 360, borderRadius: 8 },
      { x: 40, y: 450, width: 520, height: 360, borderRadius: 8 },
      { x: 40, y: 840, width: 520, height: 360, borderRadius: 8 },
      { x: 40, y: 1230, width: 520, height: 360, borderRadius: 8 }
    ]
  }

  return {
    id: 'tb-' + slug,
    name: name,
    description: String(tbData.type_name || 'TemplatesBooth'),
    photoCount: photoCount,
    stripWidth: 600,
    stripHeight: 1800,
    backgroundColor: '#FFFFFF',
    accentColor: '#0D3B24',
    textColor: '#0C1E14',
    frameImageUrl: typeof tbData.src === 'string' ? tbData.src : undefined, // using thumbnail as background
    frameMode: 'background',
    slots: slots,
    decorations: [],
    tags: tags,
    printSize: tbData.layout_size === '26strip' ? '2x6' : '4x6',
    isActive: true,
    createdAt: typeof tbData.published_at === 'string' ? tbData.published_at : new Date().toISOString(),
  }
}

// Server-side in-memory cache for fast template delivery (< 5ms response)
let serverTemplatesCache: { data: unknown; timestamp: number } | null = null
const SERVER_CACHE_TTL_MS = 60 * 1000 // 60 seconds TTL

export function invalidateServerTemplatesCache() {
  serverTemplatesCache = null
}

/**
 * GET /api/templates — list all active templates
 * GET /api/templates?id=xxx — get single template by id
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const showAll = request.nextUrl.searchParams.get('all') === 'true' && isAdmin(request)
  const headers = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
  }

  // Fast-path: return from server memory cache if asking for public template list
  if (!id && !showAll && serverTemplatesCache && (Date.now() - serverTemplatesCache.timestamp < SERVER_CACHE_TTL_MS)) {
    return NextResponse.json(serverTemplatesCache.data, { headers })
  }

  // If TB API Key is present, try to fetch from TemplatesBooth API with quick 1.5s timeout
  if (TB_API_KEY) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1500)
      if (id && id.startsWith('tb-')) {
        const slug = id.replace('tb-', '')
        const tbRes = await fetch(`https://templatesbooth.com/wp-json/tb/v1/templates?search=${slug}`, {
          headers: { 'X-API-Key': TB_API_KEY },
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (tbRes.ok) {
          const tbData = await tbRes.json()
          const item = tbData?.data?.find((t: Record<string, unknown>) => typeof t.post_url === 'string' && t.post_url.includes(slug))
          if (item) {
            return NextResponse.json({ template: mapTbTemplate(item) }, { headers })
          }
        }
      } else if (!id) {
        const tbRes = await fetch(`https://templatesbooth.com/wp-json/tb/v1/templates?per_page=20`, {
          headers: { 'X-API-Key': TB_API_KEY },
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (tbRes.ok) {
          const tbData = await tbRes.json()
          if (tbData?.data && Array.isArray(tbData.data)) {
            const mapped = tbData.data.map(mapTbTemplate)
            return NextResponse.json({ templates: mapped }, { headers })
          }
        }
      }
    } catch {
      // Quietly fall back if timeout or network failure
    }
  }

  // Fallback to Supabase / Local
  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('@/lib/supabase')

      if (id) {
        let query = supabase.from('templates').select('*').eq('id', id)
        if (!showAll) query = query.eq('is_active', true)
        const { data, error } = await query.single()

        if (!error && data) {
          return NextResponse.json({ template: normalizeFromDb(data) }, { headers })
        }
      } else {
        let query = supabase.from('templates').select('*')
        if (!showAll) {
          query = query.eq('is_active', true)
        }
        const { data, error } = await query.order('created_at', { ascending: false })

        if (!error && data) {
          const dbIds = new Set(data.map((t: Record<string, unknown>) => t.id))
          const hardcoded = TEMPLATES.filter(t => !dbIds.has(t.id))
          const responsePayload = { templates: [...data.map(normalizeFromDb), ...hardcoded] }
          if (!showAll) {
            serverTemplatesCache = { data: responsePayload, timestamp: Date.now() }
          }
          return NextResponse.json(responsePayload, { headers })
        }
      }
    } catch (err) {
      console.warn('Supabase error in /api/templates:', err)
    }
  }

  // Fallback to built-in templates
  if (id) {
    const fallback = TEMPLATES.find(t => t.id === id)
    if (fallback) return NextResponse.json({ template: fallback }, { headers })
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json({ templates: TEMPLATES }, { headers })
}

/**
 * POST /api/templates — create or submit a template
 * Admin: directly active (is_active = true)
 * Public User: submitted for approval (is_active = false)
 */
export async function POST(request: NextRequest) {
  const adminMode = isAdmin(request)

  try {
    const body = await request.json()
    const {
      name,
      description,
      creatorName,
      photoCount,
      stripWidth,
      stripHeight,
      backgroundColor,
      accentColor,
      textColor,
      frameImageUrl,
      frameMode,
      slots,
      decorations,
      tags,
      printSize,
    } = body

    if (!name || !slots || !Array.isArray(slots)) {
      return NextResponse.json({ error: 'Field nama dan slot foto wajib diisi.' }, { status: 400 })
    }

    const id = (adminMode && body.id) ? body.id : ((name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'template') + '-' + Date.now())
    const isActive = adminMode ? true : false

    const creator = (creatorName || '').trim()
    const fallbackDesc = creator
      ? (creator.startsWith('@') ? `Oleh ${creator}` : `Karya ${creator}`)
      : 'Karya Kreator Komunitas'

    const newTemplate = {
      id,
      name,
      description: description?.trim() || fallbackDesc,
      photoCount: Number(photoCount) || slots.length,
      stripWidth: Number(stripWidth) || 600,
      stripHeight: Number(stripHeight) || 1800,
      backgroundColor: backgroundColor ?? '#FFFFFF',
      accentColor: accentColor ?? '#0D3B24',
      textColor: textColor ?? '#0C1E14',
      frameImageUrl: frameImageUrl || undefined,
      frameMode: frameMode ?? 'overlay',
      slots,
      decorations: decorations ?? [],
      tags: Array.isArray(tags) ? tags : ['komunitas'],
      printSize: printSize ?? '2x6',
      isActive,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const record = {
          id: newTemplate.id,
          name: newTemplate.name,
          description: newTemplate.description,
          photo_count: newTemplate.photoCount,
          strip_width: newTemplate.stripWidth,
          strip_height: newTemplate.stripHeight,
          background_color: newTemplate.backgroundColor,
          accent_color: newTemplate.accentColor,
          text_color: newTemplate.textColor,
          frame_image_url: newTemplate.frameImageUrl,
          frame_mode: newTemplate.frameMode,
          slots: newTemplate.slots,
          decorations: newTemplate.decorations,
          tags: newTemplate.tags,
          print_size: newTemplate.printSize,
          is_active: isActive,
        }

        const { data, error } = await supabase
          .from('templates')
          .upsert([record], { onConflict: 'id' })
          .select()
          .single()

        if (!error && data) {
          return NextResponse.json({
            template: normalizeFromDb(data),
            isPending: !isActive,
            message: isActive ? 'Template berhasil diterbitkan!' : 'Terima kasih! Template berhasil disumbangkan dan sedang menunggu persetujuan admin.',
          }, { status: 201 })
        }
      } catch (err) {
        console.warn('DB insert failed, returning in-memory template:', err)
      }
    }

    serverTemplatesCache = null

    // Return in-memory created template
    return NextResponse.json({
      template: newTemplate,
      isPending: !isActive,
      message: isActive ? 'Template berhasil disimpan!' : 'Template berhasil disumbangkan dan menunggu kurasi admin.',
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/templates error:', err)
    return NextResponse.json({ error: 'Gagal memproses template.' }, { status: 500 })
  }
}

/**
 * PATCH /api/templates?id=xxx&action=approve — approve or toggle template status
 */
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  const action = request.nextUrl.searchParams.get('action') || 'approve'

  if (!id) {
    return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 })
  }

  serverTemplatesCache = null

  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('@/lib/supabase')
      const nextActive = action === 'approve'
      const { data, error } = await supabase
        .from('templates')
        .update({ is_active: nextActive })
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ template: normalizeFromDb(data), success: true })
      }
    } catch (err) {
      console.warn('Supabase patch error:', err)
    }
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/templates?id=xxx
 */
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 })
  }

  serverTemplatesCache = null

  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('templates').delete().eq('id', id)
    } catch (err) {
      console.warn('Supabase delete error:', err)
    }
  }

  return NextResponse.json({ success: true })
}

function normalizeFromDb(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    photoCount: row.photo_count,
    stripWidth: row.strip_width ?? 600,
    stripHeight: row.strip_height ?? 1800,
    backgroundColor: row.background_color ?? '#FFFFFF',
    accentColor: row.accent_color ?? '#0D3B24',
    textColor: row.text_color ?? '#0C1E14',
    frameImageUrl: row.frame_image_url,
    frameMode: row.frame_mode ?? 'overlay',
    slots: row.slots,
    decorations: row.decorations ?? [],
    tags: row.tags ?? [],
    printSize: row.print_size ?? '2x6',
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}