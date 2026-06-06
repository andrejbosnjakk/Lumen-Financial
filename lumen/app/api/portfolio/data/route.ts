import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { T212Cash, T212Position, PortfolioData } from '@/lib/types'

const BASE = 'https://live.trading212.com/api/v0'
const CACHE_TTL_MS = 60_000 // 60 seconds

// In-memory cache per user — resets on server restart, fine for dev/hackathon
const cache = new Map<string, { data: PortfolioData; expiresAt: number }>()

function buildAuthHeader(apiKey: string, apiSecret?: string | null): string {
  if (apiSecret) {
    const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    return `Basic ${token}`
  }
  return apiKey
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1'

  // Serve from cache if fresh and not a forced refresh
  const cached = cache.get(user.id)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const { data: conn } = await supabase
    .from('brokerage_connections')
    .select('api_key, api_secret')
    .eq('user_id', user.id)
    .eq('broker', 'trading212')
    .single()

  if (!conn) return NextResponse.json({ error: 'No brokerage connected' }, { status: 404 })

  const headers = { Authorization: buildAuthHeader(conn.api_key, conn.api_secret) }

  const [posRes, cashRes] = await Promise.all([
    fetch(`${BASE}/equity/portfolio`, { headers }),
    fetch(`${BASE}/equity/account/cash`, { headers }),
  ])

  if (posRes.status === 401 || cashRes.status === 401) {
    return NextResponse.json(
      { error: 'Trading 212 rejected the API key. Reconnect your account.' },
      { status: 401 }
    )
  }
  if (posRes.status === 429 || cashRes.status === 429) {
    // Serve stale cache rather than erroring if we have something
    if (cached) return NextResponse.json(cached.data)
    return NextResponse.json(
      { error: 'Trading 212 rate limit hit. Wait a moment and refresh.' },
      { status: 429 }
    )
  }
  if (!posRes.ok || !cashRes.ok) {
    const status = !posRes.ok ? posRes.status : cashRes.status
    return NextResponse.json(
      { error: `Trading 212 returned an error (HTTP ${status}). Try refreshing.` },
      { status: 502 }
    )
  }

  const posJson = await posRes.json()
  const cash: T212Cash = await cashRes.json()
  const positions: T212Position[] = posJson.items ?? posJson ?? []

  const data: PortfolioData = { positions, cash, accountType: 'live' }
  cache.set(user.id, { data, expiresAt: Date.now() + CACHE_TTL_MS })

  return NextResponse.json(data)
}
