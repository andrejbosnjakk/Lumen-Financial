import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import YahooFinance from 'yahoo-finance2'

export const runtime = 'nodejs'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// Yahoo's topHoldings sectorWeightings keys → display names
const SECTOR_LABEL: Record<string, string> = {
  realestate:               'Real Estate',
  consumer_cyclical:        'Consumer Cyclical',
  basic_materials:          'Basic Materials',
  consumer_defensive:       'Consumer Defensive',
  technology:               'Technology',
  communication_services:   'Communication Services',
  financial_services:       'Financial Services',
  utilities:                'Utilities',
  industrials:              'Industrials',
  energy:                   'Energy',
  healthcare:               'Healthcare',
}

export type TickerMeta = {
  yahooSymbol: string | null
  name: string | null
  sector: string | null
  industry: string | null
  country: string | null
  beta: number | null
  quoteType: string | null
  // ETF look-through: key → fractional weight (0–1) summing to ~1
  etfSectorWeights: Record<string, number> | null
  etfCountryWeights: Record<string, number> | null
}

// 30-minute cache — sector/country almost never change
const metaCache = new Map<string, { data: TickerMeta; expiresAt: number }>()
const symbolCache = new Map<string, { symbol: string; expiresAt: number }>()
const META_TTL     = 30 * 60_000
const ERROR_TTL    =  5 * 60_000
const SYMBOL_TTL   = 24 * 60 * 60_000

function emptyMeta(yahooSymbol: string | null = null): TickerMeta {
  return {
    yahooSymbol,
    name: null,
    sector: null,
    industry: null,
    country: null,
    beta: null,
    quoteType: null,
    etfSectorWeights: null,
    etfCountryWeights: null,
  }
}

function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, value]) => Number.isFinite(value) && value > 0)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (total <= 0) return {}
  return Object.fromEntries(entries.map(([key, value]) => [key, value / total]))
}

function addWeight(map: Record<string, number>, key: string | null | undefined, weight: number) {
  if (!key || !Number.isFinite(weight) || weight <= 0) return
  map[key] = (map[key] ?? 0) + weight
}

function holdingWeight(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (typeof obj.raw === 'number') return obj.raw
    if (typeof obj.fmt === 'string') {
      const parsed = Number(obj.fmt.replace('%', '').trim())
      if (Number.isFinite(parsed)) return parsed > 1 ? parsed / 100 : parsed
    }
  }
  return 0
}

function inferEtfCountryWeights(name: string | null, symbol: string): Record<string, number> | null {
  const text = `${name ?? ''} ${symbol}`.toUpperCase()

  if (
    /\bS&P\s*500\b/.test(text) ||
    /\bNASDAQ\s*100\b/.test(text) ||
    /\bUS\b/.test(text) ||
    /\bUSA\b/.test(text)
  ) {
    return { 'United States': 1 }
  }

  if (/\bFTSE\s+ALL[- ]WORLD\b/.test(text) || /\bALL[- ]WORLD\b/.test(text)) {
    return normalizeWeights({
      'United States': 0.64,
      Japan: 0.06,
      'United Kingdom': 0.035,
      Canada: 0.03,
      France: 0.025,
      Switzerland: 0.025,
      Germany: 0.02,
      Taiwan: 0.02,
      India: 0.02,
      Other: 0.145,
    })
  }

  if (/\bMSCI\s+WORLD\b/.test(text) || /\bDEVELOPED\s+WORLD\b/.test(text)) {
    return normalizeWeights({
      'United States': 0.72,
      Japan: 0.06,
      'United Kingdom': 0.04,
      Canada: 0.03,
      France: 0.03,
      Switzerland: 0.03,
      Germany: 0.025,
      Other: 0.065,
    })
  }

  if (/\bEMERGING\b/.test(text) || /\bEM\b/.test(text)) {
    return normalizeWeights({
      China: 0.25,
      India: 0.20,
      Taiwan: 0.18,
      'South Korea': 0.11,
      Brazil: 0.05,
      'Saudi Arabia': 0.04,
      Other: 0.17,
    })
  }

  return null
}

function cleanTicker(raw: string): string {
  return raw.trim().split('_')[0].toUpperCase()
}

function deterministicYahooGuess(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  if (!trimmed.includes('_')) return trimmed

  const parts = trimmed.split('_').filter(Boolean)
  const symbol = parts[0]
  const exchange = parts.length >= 3 ? parts[parts.length - 2] : parts[1]

  const suffixByExchange: Record<string, string> = {
    L: '.L',
    LN: '.L',
    AMS: '.AS',
    EPA: '.PA',
    PAR: '.PA',
    XETRA: '.DE',
    GER: '.DE',
    FWB: '.F',
    BME: '.MC',
    MTA: '.MI',
    SWX: '.SW',
    CPH: '.CO',
    STO: '.ST',
    OSL: '.OL',
    HEL: '.HE',
    WSE: '.WA',
  }

  return `${symbol}${suffixByExchange[exchange] ?? ''}`
}

function parseSymbolMap(raw: string, tickers: string[]): Record<string, string> {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(stripped) as unknown
    const entries = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && 'symbols' in parsed
        ? (parsed as { symbols: unknown }).symbols
        : parsed

    if (Array.isArray(entries)) {
      const map: Record<string, string> = {}
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue
        const obj = entry as Record<string, unknown>
        const input = typeof obj.input === 'string' ? obj.input : typeof obj.ticker === 'string' ? obj.ticker : null
        const yahoo = typeof obj.yahoo === 'string' ? obj.yahoo : typeof obj.yahooSymbol === 'string' ? obj.yahooSymbol : null
        if (input && yahoo) map[input] = yahoo.toUpperCase()
      }
      return map
    }

    if (entries && typeof entries === 'object') {
      return Object.fromEntries(
        Object.entries(entries as Record<string, unknown>)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, String(value).toUpperCase()])
      )
    }
  } catch {
    return {}
  }

  return Object.fromEntries(tickers.map(t => [t, deterministicYahooGuess(t)]))
}

async function resolveYahooSymbols(tickers: string[], groqKey?: string | null): Promise<Record<string, string>> {
  const now = Date.now()
  const resolved: Record<string, string> = {}
  const missing: string[] = []

  for (const ticker of tickers) {
    const cached = symbolCache.get(ticker)
    if (cached && cached.expiresAt > now) {
      resolved[ticker] = cached.symbol
    } else {
      missing.push(ticker)
    }
  }

  if (missing.length === 0) return resolved

  let groqMap: Record<string, string> = {}
  if (groqKey) {
    try {
      const client = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'Resolve brokerage ticker strings to Yahoo Finance symbols.',
              'Return only JSON shaped as {"symbols":[{"input":"ORIGINAL","yahoo":"YAHOO_SYMBOL"}]}.',
              'Keep US symbols plain, and add Yahoo exchange suffixes for non-US listings when needed.',
              'If the input is already a Yahoo Finance symbol, return it unchanged.',
            ].join(' '),
          },
          { role: 'user', content: JSON.stringify({ tickers: missing }) },
        ],
      })
      groqMap = parseSymbolMap(response.choices[0]?.message?.content ?? '{}', missing)
    } catch (err) {
      console.warn('[portfolio/risk] Groq symbol resolution failed:', err)
    }
  }

  for (const ticker of missing) {
    const symbol = groqMap[ticker] ?? groqMap[cleanTicker(ticker)] ?? deterministicYahooGuess(ticker)
    resolved[ticker] = symbol
    symbolCache.set(ticker, { symbol, expiresAt: now + SYMBOL_TTL })
  }

  return resolved
}

async function fetchMeta(ticker: string, depth = 0): Promise<TickerMeta> {
  const now = Date.now()
  const hit = metaCache.get(ticker)
  if (hit && hit.expiresAt > now) return hit.data

  const empty = emptyMeta(ticker)

  let d: Record<string, unknown>
  try {
    d = await yahooFinance.quoteSummary(ticker, {
      modules: ['assetProfile', 'price', 'topHoldings', 'fundProfile'],
    }) as Record<string, unknown>
  } catch (err) {
    console.warn(`[portfolio/risk] Yahoo metadata failed for ${ticker}:`, err)
    metaCache.set(ticker, { data: empty, expiresAt: now + ERROR_TTL })
    return empty
  }

  const profile    = d.assetProfile as Record<string, unknown> | undefined
  const price      = d.price as Record<string, unknown> | undefined
  const topHolding = d.topHoldings as Record<string, unknown> | undefined
  const fundProfile = d.fundProfile as Record<string, unknown> | undefined

  const meta: TickerMeta = { ...empty, yahooSymbol: ticker }

  // quoteType + beta from price module
  if (price) {
    meta.quoteType = (price.quoteType as string) || null
    meta.name = (price.longName as string) || (price.shortName as string) || null
    const betaRaw = (price.beta as Record<string, unknown> | undefined)?.raw
    if (typeof betaRaw === 'number') meta.beta = betaRaw
  }

  if (meta.quoteType === 'ETF' && topHolding) {
    // ── Sector weights from the ETF's aggregated sector breakdown ──
    const sectorWeightings = topHolding.sectorWeightings as Record<string, number>[] | undefined
    if (sectorWeightings?.length) {
      const sw: Record<string, number> = {}
      for (const entry of sectorWeightings) {
        for (const [key, val] of Object.entries(entry)) {
          const label = SECTOR_LABEL[key] ?? key
          sw[label] = (sw[label] ?? 0) + Number(val)
        }
      }
      if (Object.keys(sw).length > 0) meta.etfSectorWeights = sw
    }

    // ── Country weights from top holdings (depth=0 only to avoid deep recursion) ──
    if (depth === 0) {
      type Holding = { symbol: string; holdingPercent: unknown }
      const holdings = ((topHolding.holdings as Holding[]) ?? [])
        .slice(0, 25)
        .map(h => ({ symbol: h.symbol, weight: holdingWeight(h.holdingPercent) }))
        .filter(h => h.symbol && h.weight > 0)

      if (holdings.length > 0) {
        const cw: Record<string, number> = {}
        const BATCH = 4
        for (let i = 0; i < holdings.length; i += BATCH) {
          const slice = holdings.slice(i, i + BATCH)
          const results = await Promise.all(
            slice.map(h => fetchMeta(h.symbol, 1).then(m => ({ ...h, country: m.country })))
          )
          for (const r of results) {
            addWeight(cw, r.country, r.weight)
          }
        }
        if (Object.keys(cw).length > 0) meta.etfCountryWeights = normalizeWeights(cw)
      }

      const inferred = inferEtfCountryWeights(meta.name ?? (fundProfile?.categoryName as string) ?? null, ticker)
      if (inferred) meta.etfCountryWeights = inferred
    }

  } else if (profile) {
    // Regular stock / non-ETF
    meta.sector   = (profile.sector   as string) || null
    meta.industry = (profile.industry as string) || null
    meta.country  = (profile.country  as string) || null
    if (meta.beta === null && typeof profile.beta === 'number') meta.beta = profile.beta
  }

  metaCache.set(ticker, { data: meta, expiresAt: now + META_TTL })
  return meta
}

function hasUsefulMeta(meta: TickerMeta): boolean {
  return !!(
    meta.sector ||
    meta.country ||
    meta.quoteType ||
    meta.etfSectorWeights ||
    meta.etfCountryWeights
  )
}

function symbolCandidates(originalTicker: string, resolvedSymbol: string): string[] {
  return Array.from(new Set([
    resolvedSymbol,
    deterministicYahooGuess(originalTicker),
    cleanTicker(originalTicker),
  ].filter(Boolean)))
}

async function fetchBestMeta(originalTicker: string, resolvedSymbol: string): Promise<TickerMeta> {
  const candidates = symbolCandidates(originalTicker, resolvedSymbol)

  let fallback = emptyMeta(resolvedSymbol)
  for (const symbol of candidates) {
    const meta = await fetchMeta(symbol)
    fallback = meta
    if (hasUsefulMeta(meta)) return meta
  }

  return fallback
}

async function batchFetch(symbolsByTicker: Record<string, string>): Promise<Record<string, TickerMeta>> {
  const result: Record<string, TickerMeta> = {}
  const entries = Object.entries(symbolsByTicker)
  const BATCH = 4
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH)
    const pairs = await Promise.all(slice.map(([ticker, symbol]) => fetchBestMeta(ticker, symbol).then(m => [ticker, m] as const)))
    for (const [ticker, meta] of pairs) result[ticker] = meta
  }
  return result
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const raw = url.searchParams.get('tickers') ?? ''
  const debug = url.searchParams.get('debug') === '1'
  const tickers = Array.from(new Set(
    raw.split(',').map(t => t.trim()).filter(Boolean)
  )).slice(0, 50)

  if (tickers.length === 0) return NextResponse.json({ meta: {} })

  const { data: aiSettings } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key')
    .eq('user_id', user.id)
    .eq('provider', 'groq')
    .maybeSingle()

  const groqKey = aiSettings?.api_key ?? process.env.GROQ_API_KEY ?? null
  const symbolsByTicker = await resolveYahooSymbols(tickers, groqKey)
  const meta = await batchFetch(symbolsByTicker)
  return NextResponse.json(debug ? { meta, symbolsByTicker } : { meta })
}
