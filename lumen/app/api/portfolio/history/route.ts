import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPortfolioCache, getStalePorfolioCache } from '@/lib/portfolio-cache'
import type { T212Cash, T212Position } from '@/lib/types'

type Period = 'week' | 'month' | 'year' | 'all'

const T212_BASE = 'https://live.trading212.com/api/v0'

const YAHOO_SUFFIX: Record<string, string> = {
  NASDAQ: '', NYSE: '', AMEX: '', BATS: '',
  LSE: '.L', AMS: '.AS', EPA: '.PA', XETRA: '.DE',
  BME: '.MC', MTA: '.MI', SWX: '.SW', CPH: '.CO',
  STO: '.ST', OSL: '.OL', WSE: '.WA', HEL: '.HE',
}

function t212ToYahoo(ticker: string): string {
  const parts = ticker.split('_')
  if (parts.length < 3) return parts[0]
  return parts[0] + (YAHOO_SUFFIX[parts[parts.length - 1]] ?? '')
}

function periodToRange(period: Period): string {
  return ({ week: '7d', month: '1mo', year: '1y', all: '5y' } as const)[period]
}

function buildAuthHeader(key: string, secret?: string | null) {
  return secret ? `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` : key
}

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
  'Accept': '*/*',
}

async function fetchYahooPrices(symbol: string, range: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
      { headers: YAHOO_HEADERS }
    )
    if (!res.ok) return map
    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) return map
    const ts: number[] = result.timestamp ?? []
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? []
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] != null) {
        map.set(new Date(ts[i] * 1000).toISOString().split('T')[0], closes[i])
      }
    }
  } catch {}
  return map
}

function nearestPrice(map: Map<string, number>, dayStr: string, date: Date): number | undefined {
  if (map.has(dayStr)) return map.get(dayStr)
  for (let i = 1; i <= 5; i++) {
    const prev = new Date(date.getTime() - i * 86400000).toISOString().split('T')[0]
    if (map.has(prev)) return map.get(prev)
  }
}

interface T212Order {
  status: string
  type: string
  dateExecuted: string
  ticker: string
  filledQuantity: number
  quantity: number
  limitPrice?: number
  fillResult?: { value: number; price: number }
}

async function fetchAllOrders(headers: Record<string, string>): Promise<T212Order[]> {
  const orders: T212Order[] = []
  let cursor: string | null = null
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${T212_BASE}/equity/history/orders`)
    url.searchParams.set('limit', '50')
    if (cursor) url.searchParams.set('cursor', cursor)
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) break
    const json = await res.json()
    const items: T212Order[] = (json.items as T212Order[] | null) ?? []
    if (items.length === 0) break
    orders.push(...items)
    if (!json.nextPagePath) break
    try { cursor = new URLSearchParams(json.nextPagePath.split('?')[1] ?? '').get('cursor') }
    catch { break }
    if (!cursor) break
  }
  return orders
}

const BUY_TYPES = new Set(['MARKET_BUY', 'LIMIT_BUY', 'STOP_BUY'])
const SELL_TYPES = new Set(['MARKET_SELL', 'LIMIT_SELL', 'STOP_SELL'])

const historyCache = new Map<string, { points: unknown[]; expiresAt: number }>()

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const period = (new URL(request.url).searchParams.get('period') ?? 'month') as Period
  const cacheKey = `${user.id}:${period}`
  const hit = historyCache.get(cacheKey)
  if (hit && hit.expiresAt > Date.now()) return NextResponse.json({ points: hit.points })

  const { data: conn } = await supabase
    .from('brokerage_connections')
    .select('api_key, api_secret')
    .eq('user_id', user.id)
    .eq('broker', 'trading212')
    .single()
  if (!conn) return NextResponse.json({ error: 'No brokerage connected' }, { status: 404 })

  const t212Headers = { Authorization: buildAuthHeader(conn.api_key, conn.api_secret) }

  // Use the shared portfolio cache to avoid re-hitting T212's rate limit
  let portfolioData = getPortfolioCache(user.id) ?? getStalePorfolioCache(user.id)
  if (!portfolioData) {
    const [posRes, cashRes] = await Promise.all([
      fetch(`${T212_BASE}/equity/portfolio`, { headers: t212Headers }),
      fetch(`${T212_BASE}/equity/account/cash`, { headers: t212Headers }),
    ])
    if (!posRes.ok || !cashRes.ok) {
      return NextResponse.json({ error: 'Visit the Portfolio tab first to load your data.' }, { status: 503 })
    }
    const posJson = await posRes.json()
    const cash: T212Cash = await cashRes.json()
    portfolioData = { positions: posJson.items ?? posJson ?? [], cash, accountType: 'live' }
  }

  const cash: T212Cash = portfolioData.cash
  const positions: T212Position[] = portfolioData.positions ?? []
  if (positions.length === 0) return NextResponse.json({ points: [] })

  // Fetch order history and Yahoo prices in parallel
  const range = periodToRange(period)
  const currentTickers = new Set(positions.map(p => p.ticker))

  const [orders, ...priceArrays] = await Promise.all([
    fetchAllOrders(t212Headers),
    ...positions.map(pos => fetchYahooPrices(t212ToYahoo(pos.ticker), range)),
  ])

  const priceHistories = new Map<string, Map<string, number>>()
  positions.forEach((pos, i) => priceHistories.set(pos.ticker, priceArrays[i]))

  // Today's Yahoo price per ticker — used as ratio baseline
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const yahooTodayPrice = new Map<string, number>()
  for (const pos of positions) {
    const p = nearestPrice(priceHistories.get(pos.ticker)!, todayStr, today)
    if (p != null) yahooTodayPrice.set(pos.ticker, p)
  }

  // Sort all filled buy/sell orders chronologically
  const filledOrders = orders
    .filter(o => o.status === 'FILLED' && (BUY_TYPES.has(o.type) || SELL_TYPES.has(o.type)))
    .sort((a, b) => new Date(a.dateExecuted).getTime() - new Date(b.dateExecuted).getTime())

  if (filledOrders.length === 0) return NextResponse.json({ points: [] })

  // Determine start of the walk
  const firstOrderDate = new Date(filledOrders[0].dateExecuted)
  firstOrderDate.setHours(0, 0, 0, 0)

  const periodDays = { week: 7, month: 30, year: 365, all: Infinity }[period]
  const periodStart = new Date(today.getTime() - (isFinite(periodDays) ? periodDays : 0) * 86400000)
  periodStart.setHours(0, 0, 0, 0)

  // Walk starts at the later of (period start, first ever order)
  // — this prevents showing value before you started investing
  const startDate = new Date(Math.max(
    period === 'all' ? firstOrderDate.getTime() : periodStart.getTime(),
    firstOrderDate.getTime(),
  ))

  // Build initial holdings state from all orders BEFORE startDate
  const tickerQty = new Map<string, number>()
  let investedRunning = 0
  let orderIdx = 0

  while (orderIdx < filledOrders.length) {
    const o = filledOrders[orderIdx]
    const oDate = new Date(o.dateExecuted)
    oDate.setHours(0, 0, 0, 0)
    if (oDate >= startDate) break

    const qty: number = o.filledQuantity ?? o.quantity ?? 0
    const value: number = o.fillResult?.value ?? qty * (o.fillResult?.price ?? o.limitPrice ?? 0)

    if (BUY_TYPES.has(o.type)) {
      if (currentTickers.has(o.ticker)) tickerQty.set(o.ticker, (tickerQty.get(o.ticker) ?? 0) + qty)
      investedRunning += value
    } else {
      if (currentTickers.has(o.ticker)) tickerQty.set(o.ticker, Math.max(0, (tickerQty.get(o.ticker) ?? 0) - qty))
      investedRunning = Math.max(0, investedRunning - value)
    }
    orderIdx++
  }

  // Walk day by day, applying orders as they land
  const points: { date: string; totalValue: number; invested: number; ppl: number }[] = []
  let cur = new Date(startDate)

  while (cur <= today) {
    const dayStr = cur.toISOString().split('T')[0]

    // Apply any orders that executed on this calendar day
    while (orderIdx < filledOrders.length) {
      const o = filledOrders[orderIdx]
      const oDate = new Date(o.dateExecuted)
      oDate.setHours(0, 0, 0, 0)
      if (oDate > cur) break

      const qty: number = o.filledQuantity ?? o.quantity ?? 0
      const value: number = o.fillResult?.value ?? qty * (o.fillResult?.price ?? o.limitPrice ?? 0)

      if (BUY_TYPES.has(o.type)) {
        if (currentTickers.has(o.ticker)) tickerQty.set(o.ticker, (tickerQty.get(o.ticker) ?? 0) + qty)
        investedRunning += value
      } else {
        if (currentTickers.has(o.ticker)) tickerQty.set(o.ticker, Math.max(0, (tickerQty.get(o.ticker) ?? 0) - qty))
        investedRunning = Math.max(0, investedRunning - value)
      }
      orderIdx++
    }

    if (dayStr === todayStr) {
      // Use live T212 totals for today
      points.push({ date: dayStr, totalValue: cash.total, invested: cash.invested, ppl: cash.ppl })
    } else {
      let equity = 0
      let hasData = false

      for (const pos of positions) {
        const qty = tickerQty.get(pos.ticker) ?? 0
        if (qty <= 0) continue

        const histPrice = nearestPrice(priceHistories.get(pos.ticker)!, dayStr, cur)
        const nowPrice = yahooTodayPrice.get(pos.ticker)

        // Scale the T212 EUR value by the Yahoo price ratio — handles FX automatically
        if (histPrice != null && nowPrice != null && nowPrice > 0) {
          equity += qty * pos.currentPrice * (histPrice / nowPrice)
          hasData = true
        }
      }

      if (hasData) {
        const totalValue = equity + cash.free
        const inv = investedRunning > 0 ? investedRunning : cash.invested
        points.push({ date: dayStr, totalValue, invested: inv, ppl: totalValue - inv })
      }
    }

    cur = new Date(cur.getTime() + 86400000)
  }

  historyCache.set(cacheKey, { points, expiresAt: Date.now() + 10 * 60_000 })
  return NextResponse.json({ points })
}
