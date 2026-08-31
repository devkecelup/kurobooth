import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

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

/** Upload lossless image to Catbox.moe (permanent free hosting without recompression) */
async function uploadToCatbox(buffer: Buffer, fileName: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
    formData.append('fileToUpload', blob, fileName)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const url = await res.text()
      if (url && url.startsWith('http')) {
        return url.trim()
      }
    }
  } catch (err) {
    console.warn('Catbox upload error or timeout, continuing with backups:', err)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const shareCode = formData.get('shareCode') as string

    if (!file || !shareCode) {
      return NextResponse.json({ error: 'Missing file or shareCode' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = `kurobooth-${shareCode}.png`

    // 1. Try uploading to Catbox for 100% original uncompressed online link
    let catboxUrl = await uploadToCatbox(buffer, fileName)

    // 2. Always write to local storage as fallback
    let localUrl = `/uploads/results/${shareCode}.png`
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'results')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, `${shareCode}.png`)
      await fs.writeFile(filePath, buffer)
    } catch (e) {
      console.warn('Local disk write error:', e)
    }

    // 3. Try Supabase storage if configured
    let supabaseUrl: string | null = null
    if (isSupabaseConfigured()) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const remotePath = `results/${shareCode}.png`
        const { error: uploadError } = await supabase.storage
          .from('photobooth-results')
          .upload(remotePath, buffer, {
            contentType: 'image/png',
            upsert: true,
          })

        if (!uploadError) {
          const { data } = supabase.storage
            .from('photobooth-results')
            .getPublicUrl(remotePath)
          supabaseUrl = data.publicUrl
        }
      } catch (e) {
        console.warn('Supabase storage upload error:', e)
      }
    }

    // Prefer online public URL (Catbox or Supabase) so QR codes work on phones, else local
    const finalUrl = catboxUrl || supabaseUrl || localUrl

    return NextResponse.json({
      url: finalUrl,
      catboxUrl,
      supabaseUrl,
      localUrl,
    }, { status: 200 })
  } catch (err) {
    console.error('Upload POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
