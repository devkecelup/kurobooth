import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

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

// In-memory sessions store fallback for local / non-database mode
const localSessions = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const { templateId, imageUrl, shareCode } = await request.json()

    if (!templateId || !imageUrl || !shareCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newSession = {
      id: 'sess-' + shareCode,
      template_id: templateId,
      image_url: imageUrl,
      share_code: shareCode,
      created_at: new Date().toISOString(),
    }

    // 1. Try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('sessions')
          .insert([{ template_id: templateId, image_url: imageUrl, share_code: shareCode }])
          .select()
          .single()

        if (!error && data) {
          localSessions.set(shareCode, data)
          return NextResponse.json({ session: data }, { status: 201 })
        }
      } catch (e) {
        console.warn('Supabase session insert failed, falling back to local memory store:', e)
      }
    }

    // 2. In-memory local session fallback
    localSessions.set(shareCode, newSession)
    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (err) {
    console.error('Session POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const shareCode = request.nextUrl.searchParams.get('shareCode')

    if (!shareCode) {
      return NextResponse.json({ error: 'shareCode is required' }, { status: 400 })
    }

    // 1. Try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('share_code', shareCode)
          .single()

        if (!error && data) {
          return NextResponse.json({ session: data })
        }
      } catch (e) {
        console.warn('Supabase session lookup error, checking local store:', e)
      }
    }

    // 2. Check in-memory store
    const local = localSessions.get(shareCode)
    if (local) {
      return NextResponse.json({ session: local })
    }

    // 3. Fallback: if file exists on disk, construct a session
    return NextResponse.json({
      session: {
        id: 'sess-' + shareCode,
        template_id: 'forest-minimalist',
        image_url: `/uploads/results/${shareCode}.png`,
        share_code: shareCode,
      }
    })
  } catch (err) {
    console.error('Session GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
