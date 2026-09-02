import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/download?url=<encoded_image_url>&name=<filename>
 * Server-side proxy to fetch the image and stream it back with Content-Disposition: attachment
 * This forces browser download instead of opening the URL in a new tab.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const name = request.nextUrl.searchParams.get('name') || 'kurobooth-strip.png'

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'KuroBooth/1.0' },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[Download proxy] Error:', err)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
