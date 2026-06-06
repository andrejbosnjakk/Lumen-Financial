import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
  'Accept': '*/*',
}

// 5-minute in-memory price cache to avoid hammering Yahoo on each page load
const priceCache = new Map<string, { price: number; expiresAt: number }>()

async function fetchPrice(ticker: string): Promise<number | null> {
  const now = Date.now()
  const cached = priceCache.get(ticker)
  if (cached && cached.expiresAt > now) return cached.price

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: YAHOO_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    const price: number | undefined = d.chart?.result?.[0]?.meta?.regularMarketPrice
    if (price) priceCache.set(ticker, { price, expiresAt: now + 5 * 60_000 })
    return price ?? null
  } catch {
    return null
  }
}

export type ImportedPosition = {
  id: string
  symbol: string
  isin: string | null
  name: string
  quantity: number
  avgCost: number
  statementPrice: number | null
  yahooTicker: string | null
  currency: string
  currentPrice: number
  marketValue: number
  pnl: number
  pnlPct: number
  priceSource: 'live' | 'statement' | 'cost'
}

export type BrokerImport = {
  id: string
  broker: string
  filename: string
  importedAt: string
  positions: ImportedPosition[]
  totalValue: number
  totalCost: number
  totalPnl: number
  totalPnlPct: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: imports } = await supabase
    .from('broker_imports')
    .select('id, broker, filename, imported_at')
    .eq('user_id', user.id)
    .order('imported_at', { ascending: false })

  if (!imports || imports.length === 0) return NextResponse.json({ imports: [] })

  const { data: rawPositions } = await supabase
    .from('broker_positions')
    .select('*')
    .eq('user_id', user.id)

  // Fetch live prices in parallel (batched)
  const tickerSet = new Set((rawPositions ?? []).map(p => p.yahoo_ticker).filter(Boolean) as string[])
  const tickers = Array.from(tickerSet)
  const priceResults = await Promise.all(tickers.map(t => fetchPrice(t).then(p => [t, p] as const)))
  const livePrice = new Map(priceResults.filter(([, p]) => p !== null) as [string, number][])

  const result: BrokerImport[] = imports.map(imp => {
    const positions: ImportedPosition[] = (rawPositions ?? [])
      .filter(p => p.import_id === imp.id)
      .map(p => {
        let currentPrice: number
        let priceSource: 'live' | 'statement' | 'cost'

        if (p.yahoo_ticker && livePrice.has(p.yahoo_ticker)) {
          currentPrice = livePrice.get(p.yahoo_ticker)!
          priceSource = 'live'
        } else if (p.statement_price) {
          currentPrice = Number(p.statement_price)
          priceSource = 'statement'
        } else {
          currentPrice = Number(p.avg_cost)
          priceSource = 'cost'
        }

        const qty = Number(p.quantity)
        const avgCost = Number(p.avg_cost)
        const marketValue = qty * currentPrice
        const pnl = qty * (currentPrice - avgCost)
        const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0

        return {
          id: p.id,
          symbol: p.symbol,
          isin: p.isin ?? null,
          name: p.name,
          quantity: qty,
          avgCost,
          statementPrice: p.statement_price ? Number(p.statement_price) : null,
          yahooTicker: p.yahoo_ticker ?? null,
          currency: p.currency,
          currentPrice,
          marketValue,
          pnl,
          pnlPct,
          priceSource,
        }
      })

    const totalValue = positions.reduce((s, p) => s + p.marketValue, 0)
    const totalCost  = positions.reduce((s, p) => s + p.quantity * p.avgCost, 0)
    const totalPnl   = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

    return {
      id: imp.id,
      broker: imp.broker,
      filename: imp.filename,
      importedAt: imp.imported_at,
      positions,
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPct,
    }
  })

  return NextResponse.json({ imports: result })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { broker } = await request.json()
  if (!broker) return NextResponse.json({ error: 'broker is required' }, { status: 400 })

  await supabase.from('broker_imports').delete().eq('user_id', user.id).eq('broker', broker)
  return NextResponse.json({ ok: true })
}
