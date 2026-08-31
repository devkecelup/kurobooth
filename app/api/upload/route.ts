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

const IMGBB_API_KEY = process.env.IMGBB_API_KEY ?? '18c5d23114ae652790650c0adc75cce0'

/** Upload original high-res image to ImgBB (free unlimited image hosting) */
async function uploadToImgBB(buffer: Buffer, fileName: string): Promise<string | null> {
  if (!IMGBB_API_KEY) return null
  try {
    const formData = new FormData()
    formData.append('key', IMGBB_API_KEY)
    formData.append('image', buffer.toString('base64'))
    formData.append('name', fileName.replace(/\.[^/.]+$/, ''))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data?.data?.url) {
        console.log('[Upload] ImgBB upload success:', data.data.url)
        return data.data.url
      }
    } else {
      const errText = await res.text()
      console.warn('[Upload] ImgBB error response:', errText)
    }
  } catch (err) {
    console.warn('[Upload] ImgBB upload failed:', err)
  }
  return null
}

/** Upload lossless image to Catbox.moe (permanent free hosting without recompression) */
async function uploadToCatbox(buffer: Buffer, fileName: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
    formData.append('fileToUpload', blob, fileName)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

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

    // 1. Try ImgBB first (Fast external image hosting - saves 100% Supabase storage space)
    let imgbbUrl = await uploadToImgBB(buffer, fileName)

    // 2. Try Supabase storage as backup or alternative
    let supabaseUrl: string | null = null
    if (!imgbbUrl && isSupabaseConfigured()) {
      try {
        const { supabaseAdmin, supabase } = await import('@/lib/supabase')
        const client = supabaseAdmin || supabase
        const remotePath = `results/${shareCode}.png`

        let { error: uploadError } = await client.storage
          .from('photobooth-results')
          .upload(remotePath, buffer, {
            contentType: 'image/png',
            upsert: true,
          })

        // If bucket not found, try auto-creating the bucket and re-uploading
        if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as any).statusCode === '404')) {
          console.log('[Upload] Bucket photobooth-results not found, attempting auto-creation...')
          try {
            await client.storage.createBucket('photobooth-results', { public: true })
            const retry = await client.storage
              .from('photobooth-results')
              .upload(remotePath, buffer, {
                contentType: 'image/png',
                upsert: true,
              })
            uploadError = retry.error
          } catch (createErr) {
            console.warn('[Upload] Failed to auto-create bucket:', createErr)
          }
        }

        if (!uploadError) {
          const { data } = client.storage
            .from('photobooth-results')
            .getPublicUrl(remotePath)
          supabaseUrl = data.publicUrl
          console.log('[Upload] Supabase Storage upload success:', supabaseUrl)
        } else {
          console.error('[Upload] Supabase Storage upload error:', uploadError.message || uploadError)
        }
      } catch (e) {
        console.error('[Upload] Supabase storage unexpected exception:', e)
      }
    }

    // 3. Try Catbox as fallback
    let catboxUrl: string | null = null
    if (!imgbbUrl && !supabaseUrl) {
      catboxUrl = await uploadToCatbox(buffer, fileName)
    }

    // 4. Write to local storage as fallback for local dev
    let localUrl = `/uploads/results/${shareCode}.png`
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'results')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, `${shareCode}.png`)
      await fs.writeFile(filePath, buffer)
    } catch (e) {
      // Ignored in serverless read-only environments
    }

    // Prefer ImgBB or Supabase so QR codes and shares work everywhere
    const finalUrl = imgbbUrl || supabaseUrl || catboxUrl || localUrl

    return NextResponse.json({
      url: finalUrl,
      imgbbUrl,
      supabaseUrl,
      catboxUrl,
      localUrl,
    }, { status: 200 })
  } catch (err) {
    console.error('Upload POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
