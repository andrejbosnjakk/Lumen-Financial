import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPortfolioCache, setPortfolioCache, getStalePorfolioCache } from '@/lib/portfolio-cache'
import type { T212Cash, T212Position, PortfolioData } from '@/lib/types'

const BASE = 'https://live.trading212.com/api/v0'

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

  const cached = getPortfolioCache(user.id)
  if (!forceRefresh && cached) return NextResponse.json(cached)

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
    const stale = getStalePorfolioCache(user.id)
    if (stale) return NextResponse.json(stale)
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
  setPortfolioCache(user.id, data)

  // Save a snapshot at most once per hour (fire and forget)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  supabase
    .from('portfolio_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('recorded_at', oneHourAgo)
    .then(({ count }) => {
      if (!count) {
        supabase.from('portfolio_snapshots').insert({
          user_id: user.id,
          broker: 'trading212',
          total_value: cash.total,
          invested: cash.invested,
          ppl: cash.ppl,
          cash: cash.free,
        })
      }
    })

  return NextResponse.json(data)
}
