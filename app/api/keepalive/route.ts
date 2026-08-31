import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * GET /api/keepalive
 *
 * A lightweight endpoint that pings Supabase to prevent the free-tier
 * project from being auto-paused after 7 days of inactivity.
 *
 * Call this endpoint at least once every 3-5 days via:
 *  - Vercel Cron Jobs (vercel.json) — automatic if deployed on Vercel
 *  - GitHub Actions scheduled workflow (.github/workflows/keepalive.yml)
 *  - External cron service like cron-job.org
 */
export async function GET(request: Request) {
  // Optional: protect with a secret token so random people can't spam it
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Lightweight query — just fetch 1 row from templates table
    const start = Date.now()
    const { error } = await supabase
      .from('templates')
      .select('id')
      .limit(1)

    const latencyMs = Date.now() - start

    if (error) {
      console.error('[keepalive] Supabase query error:', error.message)
      return NextResponse.json(
        { ok: false, error: error.message, latencyMs },
        { status: 500 }
      )
    }

    console.log(`[keepalive] ✅ Supabase is alive (${latencyMs}ms)`)
    return NextResponse.json({
      ok: true,
      message: 'Supabase pinged successfully',
      latencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[keepalive] Unexpected error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
