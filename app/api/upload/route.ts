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

/** Upload to ImgBB (free unlimited image hosting) */
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

/** Upload to Catbox.moe (permanent free hosting) */
async function uploadToCatbox(buffer: Buffer, fileName: string, mimeType: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
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

    // Detect file type from the uploaded file's name/type
    const isWebP = file.name.endsWith('.webp') || file.type === 'image/webp'
    const ext = isWebP ? 'webp' : 'png'
    const mimeType = isWebP ? 'image/webp' : 'image/png'
    const fileName = `kurobooth-${shareCode}.${ext}`
    const remotePath = `results/${shareCode}.${ext}`

    // 1. Primary: Upload directly to Supabase Storage bucket 'photobooth-results'
    let supabaseUrl: string | null = null
    if (isSupabaseConfigured()) {
      try {
        const { supabaseAdmin, supabase } = await import('@/lib/supabase')
        const client = supabaseAdmin || supabase

        let { error: uploadError } = await client.storage
          .from('photobooth-results')
          .upload(remotePath, buffer, {
            contentType: mimeType,
            upsert: true,
          })

        // Auto-create bucket if missing
        if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as { statusCode?: string }).statusCode === '404')) {
          console.log('[Upload] Bucket photobooth-results not found, attempting auto-creation...')
          try {
            await client.storage.createBucket('photobooth-results', { public: true })
            const retry = await client.storage
              .from('photobooth-results')
              .upload(remotePath, buffer, {
                contentType: mimeType,
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

    // 2. Fallback: ImgBB
    let imgbbUrl: string | null = null
    if (!supabaseUrl && IMGBB_API_KEY) {
      imgbbUrl = await uploadToImgBB(buffer, fileName)
    }

    // 3. Fallback: Catbox (permanent free hosting)
    let catboxUrl: string | null = null
    if (!supabaseUrl && !imgbbUrl) {
      catboxUrl = await uploadToCatbox(buffer, fileName, mimeType)
    }

    // 4. Fallback: Local disk for development & DataURL for serverless
    const localUrl = `/uploads/results/${shareCode}.${ext}`
    let isLocalSaved = false
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'results')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, `${shareCode}.${ext}`)
      await fs.writeFile(filePath, buffer)
      isLocalSaved = true
    } catch {
      // Ignored in serverless
    }

    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production'

    // If on serverless and remote uploads failed, dataUrl guarantees zero 404 broken images
    const finalUrl = supabaseUrl || imgbbUrl || catboxUrl || (isServerless && !isLocalSaved ? dataUrl : localUrl)

    return NextResponse.json({
      url: finalUrl,
      supabaseUrl,
      imgbbUrl,
      catboxUrl,
      localUrl: isLocalSaved ? localUrl : null,
      dataUrl: (!supabaseUrl && !imgbbUrl && !catboxUrl) ? dataUrl : undefined,
    }, { status: 200 })
  } catch (err) {
    console.error('Upload POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
