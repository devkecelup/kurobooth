import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'admin-secret-change-me'
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const secretParam = request.nextUrl.searchParams.get('secret') ?? ''
    const token = authHeader.replace('Bearer ', '').trim() || secretParam

    if (token !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          return NextResponse.json({ sessions: data }, { status: 200 })
        }
      } catch (e) {
        console.warn('Supabase admin session fetch error, checking local store:', e)
      }
    }

    // 2. Scan local uploads folder
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'results')
    const localList: any[] = []
    try {
      const files = await fs.readdir(uploadDir)
      for (const file of files) {
        if (file.endsWith('.png')) {
          const shareCode = file.replace('.png', '')
          localList.push({
            id: 'local-' + shareCode,
            template_id: 'forest-minimalist',
            image_url: `/uploads/results/${file}`,
            share_code: shareCode,
            created_at: new Date().toISOString(),
          })
        }
      }
    } catch {
      // Directory may not exist yet
    }

    return NextResponse.json({ sessions: localList }, { status: 200 })
  } catch (err) {
    console.error('Admin sessions GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const secretParam = request.nextUrl.searchParams.get('secret') ?? ''
    const token = authHeader.replace('Bearer ', '').trim() || secretParam

    if (token !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shareCode = request.nextUrl.searchParams.get('shareCode')
    if (!shareCode) {
      return NextResponse.json({ error: 'shareCode is required' }, { status: 400 })
    }

    // Delete from Supabase
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase.from('sessions').delete().eq('share_code', shareCode)
      } catch (e) {
        console.warn('Supabase session delete error:', e)
      }
    }

    // Delete local file if exists
    try {
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'results', `${shareCode}.png`)
      await fs.unlink(filePath)
    } catch {
      // Ignore if file not found
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Admin sessions DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}