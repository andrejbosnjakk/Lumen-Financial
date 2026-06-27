import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIBKR } from '@/lib/parsers/ibkr'
import { parseDEGIRO } from '@/lib/parsers/degiro'

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
  'Accept': '*/*',
}

async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: YAHOO_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    return d.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

/** For IBKR positions: try raw symbol, then currency-based exchange suffixes. */
async function ibkrToYahoo(symbol: string, currency: string): Promise<{ ticker: string; price: number } | null> {
  const candidates: string[] = []
  if (currency === 'USD') candidates.push(symbol)
  else if (currency === 'EUR') candidates.push(symbol, `${symbol}.AS`, `${symbol}.DE`, `${symbol}.PA`, `${symbol}.MI`, `${symbol}.MC`)
  else if (currency === 'GBP') candidates.push(`${symbol}.L`, symbol)
  else candidates.push(symbol)

  for (const t of candidates) {
    const price = await fetchYahooPrice(t)
    if (price) return { ticker: t, price }
  }
  return null
}

/** For DEGIRO: search Yahoo Finance by ISIN to resolve the ticker. */
async function isinToYahoo(isin: string): Promise<{ ticker: string; price: number } | null> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${isin}&newsCount=0&enableFuzzyQuery=false`,
      { headers: YAHOO_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    const ticker = d.quotes?.[0]?.symbol as string | undefined
    if (!ticker) return null
    const price = await fetchYahooPrice(ticker)
    if (!price) return null
    return { ticker, price }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const broker = formData.get('broker') as string
  const file   = formData.get('file') as File | null

  if (!['ibkr', 'degiro'].includes(broker)) {
    return NextResponse.json({ error: 'Invalid broker' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const csvText = await file.text()

  type RawPos = {
    symbol: string
    isin?: string
    name: string
    quantity: number
    avgCost: number
    statementPrice?: number
    currency: string
  }

  let rawPositions: RawPos[] = []

  if (broker === 'ibkr') {
    const parsed = parseIBKR(csvText)
    if (parsed.length === 0) {
      return NextResponse.json({
        error: 'No positions found. Make sure you upload an IBKR Activity Statement with the "Open Positions" section included.',
      }, { status: 400 })
    }
    rawPositions = parsed.map(p => ({
      symbol: p.symbol,
      name: p.symbol,
      quantity: p.quantity,
      avgCost: p.costPrice,
      statementPrice: p.closePrice,
      currency: p.currency,
    }))
  } else {
    const parsed = parseDEGIRO(csvText)
    if (parsed.length === 0) {
      return NextResponse.json({
        error: 'No positions found. Make sure you upload the DEGIRO "Transacties" or account statement CSV.',
      }, { status: 400 })
    }
    rawPositions = parsed.map(p => ({
      symbol: p.isin,
      isin: p.isin,
      name: p.name,
      quantity: p.quantity,
      avgCost: p.avgCost,
      currency: p.currency,
    }))
  }

  // Resolve current prices in parallel (limit concurrency to avoid rate limits)
  const BATCH = 4
  const resolved: (RawPos & { yahooTicker: string | null; currentPrice: number })[] = []

  for (let i = 0; i < rawPositions.length; i += BATCH) {
    const batch = rawPositions.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async pos => {
      let yahooTicker: string | null = null
      let currentPrice = pos.statementPrice ?? pos.avgCost

      const result = broker === 'ibkr'
        ? await ibkrToYahoo(pos.symbol, pos.currency)
        : await isinToYahoo(pos.isin ?? pos.symbol)

      if (result) {
        yahooTicker = result.ticker
        currentPrice = result.price
      }
      return { ...pos, yahooTicker, currentPrice }
    }))
    resolved.push(...results)
  }

  // Replace existing import for this broker (one snapshot per broker per user)
  await supabase.from('broker_imports').delete().eq('user_id', user.id).eq('broker', broker)

  const { data: imp, error: impErr } = await supabase
    .from('broker_imports')
    .insert({ user_id: user.id, broker, filename: file.name })
    .select('id')
    .single()

  if (impErr || !imp) {
    return NextResponse.json({ error: 'Failed to save import record' }, { status: 500 })
  }

  const rows = resolved.map(p => ({
    import_id: imp.id,
    user_id:   user.id,
    broker,
    symbol:          p.symbol,
    isin:            p.isin ?? null,
    name:            p.name,
    quantity:        p.quantity,
    avg_cost:        p.avgCost,
    statement_price: p.statementPrice ?? null,
    yahoo_ticker:    p.yahooTicker,
    currency:        p.currency,
  }))

  const { error: posErr } = await supabase.from('broker_positions').insert(rows)
  if (posErr) return NextResponse.json({ error: 'Failed to save positions' }, { status: 500 })

  return NextResponse.json({ ok: true, count: rows.length, broker, filename: file.name })
}
