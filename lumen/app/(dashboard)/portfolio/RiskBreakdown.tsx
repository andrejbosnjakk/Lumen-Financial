'use client'

import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TickerMeta } from '@/app/api/portfolio/risk/route'
import { useChartTheme } from '@/lib/useChartTheme'

export type RiskPosition = {
  ticker: string
  marketValue: number
  currency: string
}

const COLORS = [
  'var(--lumen-accent)', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#A855F7', '#6366F1',
]
const COLOR_FALLBACK = '#9CA3AF'

const LAST_BUCKETS = new Set(['Unknown', 'ETF / Fund', 'Other'])

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

type Slice = { name: string; value: number }

/**
 * Groups positions by a dimension (sector | country | currency).
 * For ETFs with look-through data, the position's market value is
 * distributed proportionally across the ETF's underlying weights.
 */
function groupDimension(
  positions: RiskPosition[],
  meta: Record<string, TickerMeta | null>,
  dim: 'sector' | 'country' | 'currency',
): Slice[] {
  const map = new Map<string, number>()

  for (const pos of positions) {
    if (dim === 'currency') {
      const key = pos.currency || 'Unknown'
      map.set(key, (map.get(key) ?? 0) + pos.marketValue)
      continue
    }

    const m = meta[pos.ticker]

    if (m?.quoteType === 'ETF') {
      const weights = dim === 'sector' ? m.etfSectorWeights : m.etfCountryWeights

      if (weights && Object.keys(weights).length > 0) {
        // Look-through: distribute the ETF's market value across underlying exposures
        let covered = 0
        for (const [key, w] of Object.entries(weights)) {
          map.set(key, (map.get(key) ?? 0) + pos.marketValue * w)
          covered += w
        }
        // Top-N holdings may not cover 100% of the fund; remainder > Other
        const remainder = 1 - covered
        if (remainder > 0.02) {
          map.set('Other', (map.get('Other') ?? 0) + pos.marketValue * remainder)
        }
      } else {
        // ETF but Yahoo returned no data
        map.set('ETF / Fund', (map.get('ETF / Fund') ?? 0) + pos.marketValue)
      }
    } else {
      const key = (dim === 'sector' ? m?.sector : m?.country) ?? 'Unknown'
      map.set(key, (map.get(key) ?? 0) + pos.marketValue)
    }
  }

  return Array.from(map.entries())
    .sort(([ak, av], [bk, bv]) => {
      const aLast = LAST_BUCKETS.has(ak) ? 1 : 0
      const bLast = LAST_BUCKETS.has(bk) ? 1 : 0
      if (aLast !== bLast) return aLast - bLast
      return bv - av
    })
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
}

function colorFor(name: string, index: number) {
  return LAST_BUCKETS.has(name) ? COLOR_FALLBACK : COLORS[index % COLORS.length]
}

function DonutPanel({
  title,
  subtitle,
  data,
  total,
  loading,
}: {
  title: string
  subtitle: string
  data: Slice[]
  total: number
  loading: boolean
}) {
  const chartTheme = useChartTheme()
  const MAX_LEGEND = 7
  const top = data.slice(0, MAX_LEGEND)
  const otherVal = data.slice(MAX_LEGEND).reduce((s, d) => s + d.value, 0)
  const chartData: Slice[] = [
    ...top,
    ...(otherVal > 0 ? [{ name: 'Other', value: Math.round(otherVal * 100) / 100 }] : []),
  ]

  return (
    <section className="lumen-panel rounded-[28px] p-5">
      <h3 className="text-sm font-semibold text-lumen-text">{title}</h3>
      <p className="mt-0.5 text-xs text-lumen-muted">{subtitle}</p>

      {loading ? (
        <div className="flex h-[180px] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-xs text-lumen-muted">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={75}
              paddingAngle={3}
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={colorFor(d.name, i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [fmt(Number(v)), 'Value']}
              contentStyle={{
                background: chartTheme.tooltip.bg,
                border: `1px solid ${chartTheme.tooltip.border}`,
                borderRadius: 16,
                fontSize: 12,
                color: chartTheme.tooltip.text,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {!loading && data.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {chartData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2 rounded-xl bg-lumen-fill-sm px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2 text-[11px] text-lumen-muted">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: colorFor(d.name, i) }} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="tabular-nums text-[11px] font-semibold text-lumen-text">
                {total > 0 ? ((d.value / total) * 100).toFixed(1) + '%' : '-'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function computeHHI(positions: RiskPosition[]) {
  const total = positions.reduce((s, p) => s + p.marketValue, 0)
  if (total === 0) return 0
  return positions.reduce((s, p) => s + (p.marketValue / total) ** 2, 0)
}

function hhiLabel(score: number): { label: string; tone: string } {
  if (score < 0.15) return { label: 'Diversified', tone: 'text-lumen-success' }
  if (score < 0.25) return { label: 'Moderate', tone: 'text-lumen-warning' }
  return { label: 'Concentrated', tone: 'text-lumen-danger' }
}

export default function RiskBreakdown({ positions }: { positions: RiskPosition[] }) {
  const [meta, setMeta] = useState<Record<string, TickerMeta | null>>({})
  const [loading, setLoading] = useState(true)
  const tickerKey = Array.from(new Set(positions.map(p => p.ticker))).sort().join(',')

  useEffect(() => {
    if (positions.length === 0) { setLoading(false); return }
    setLoading(true)
    const tickers = tickerKey
    fetch(`/api/portfolio/risk?tickers=${encodeURIComponent(tickers)}`)
      .then(r => r.json())
      .then(d => setMeta(d.meta ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [positions.length, tickerKey])

  if (positions.length === 0) return null

  const total = positions.reduce((s, p) => s + p.marketValue, 0)

  const currencyData = groupDimension(positions, meta, 'currency')
  const sectorData   = groupDimension(positions, meta, 'sector')
  const countryData  = groupDimension(positions, meta, 'country')

  const hhiScore = computeHHI(positions)
  const { label: hhiLbl, tone: hhiTone } = hhiLabel(hhiScore)

  const topPct = total > 0
    ? (Math.max(...positions.map(p => p.marketValue)) / total) * 100
    : 0

  const uniqueCountries = new Set(
    Object.values(meta).flatMap(m => [
      m?.country,
      ...Object.keys(m?.etfCountryWeights ?? {}),
    ]).filter(Boolean)
  ).size

  const uniqueSectors = new Set(
    Object.values(meta).flatMap(m => [
      m?.sector,
      ...Object.keys(m?.etfSectorWeights ?? {}),
    ]).filter(Boolean)
  ).size

  // Weighted portfolio beta (stocks + ETF-level betas)
  const betaTerms = positions
    .map(p => ({ w: total > 0 ? p.marketValue / total : 0, beta: meta[p.ticker]?.beta ?? null }))
    .filter((x): x is { w: number; beta: number } => x.beta !== null)
  const weightedBeta = betaTerms.length > 0
    ? betaTerms.reduce((s, x) => s + x.w * x.beta, 0)
    : null

  const statChips = [
    { label: 'Countries', value: loading ? '...' : uniqueCountries > 0 ? String(uniqueCountries) : '-' },
    { label: 'Sectors',   value: loading ? '...' : uniqueSectors   > 0 ? String(uniqueSectors)   : '-' },
    { label: 'Top position', value: topPct.toFixed(1) + '%' },
    ...(weightedBeta !== null
      ? [{ label: 'Portfolio beta', value: weightedBeta.toFixed(2) }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-lumen-text">Risk Breakdown</h2>
        <p className="mt-0.5 text-xs text-lumen-muted">
          Exposure by sector, geography, and currency. ETF holdings are analysed with look-through.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DonutPanel title="Currency"  subtitle="Settlement currency"   data={currencyData} total={total} loading={false} />
        <DonutPanel title="Sector"    subtitle="Incl. ETF look-through" data={sectorData}   total={total} loading={loading} />
        <DonutPanel title="Country"   subtitle="Company domicile"       data={countryData}  total={total} loading={loading} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statChips.map(({ label, value }) => (
          <div key={label} className="lumen-panel rounded-[18px] px-4 py-3">
            <p className="text-[11px] font-medium text-lumen-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-lumen-text">{value}</p>
          </div>
        ))}
        <div className="lumen-panel rounded-[18px] px-4 py-3">
          <p className="text-[11px] font-medium text-lumen-muted">Concentration</p>
          <p className={`mt-1 text-lg font-semibold ${hhiTone}`}>{hhiLbl}</p>
        </div>
      </div>
    </div>
  )
}
