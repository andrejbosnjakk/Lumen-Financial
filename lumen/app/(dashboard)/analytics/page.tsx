'use client'

import { useEffect, useState } from 'react'
import { Download, Store, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import FinancialChat from './FinancialChat'
import SubscriptionTracker from './SubscriptionTracker'
import ZombieTracker from './ZombieTracker'
import AgeComparison from './AgeComparison'
import BehavioralInsights from './BehavioralInsights'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsData } from '@/lib/types'
import { getCachedAnalytics, setCachedAnalytics } from '@/lib/analyticsCache'
import { useChartTheme, type ChartTheme } from '@/lib/useChartTheme'
import { categoryColor } from '@/lib/categoryColors'

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function shortFmt(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1000) return `EUR ${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `EUR ${Math.round(n)}`
}

type Period = 'week' | 'month' | '3months' | 'year' | 'all'
type Granularity = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: '3 Months' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
]

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function getDateRange(period: Period): { from: string; to: string } | null {
  if (period === 'all') return null
  const today = new Date()
  const to = toISO(today)
  switch (period) {
    case 'week': {
      const day = today.getDay()
      const mon = new Date(today)
      mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
      return { from: toISO(mon), to }
    }
    case 'month':
      return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, to }
    case '3months': {
      const from = new Date(today)
      from.setMonth(today.getMonth() - 3)
      return { from: toISO(from), to }
    }
    case 'year':
      return { from: `${today.getFullYear()}-01-01`, to }
  }
}

function getGranularity(period: Period): Granularity {
  if (period === 'week' || period === 'month') return 'day'
  if (period === '3months') return 'week'
  return 'month'
}

function formatTick(key: string, granularity: Granularity, period: Period): string {
  if (granularity === 'month') {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  }
  const d = new Date(`${key}T12:00:00`)
  if (granularity === 'week') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (period === 'week') return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function xInterval(dataLen: number): number {
  if (dataLen <= 10) return 0
  if (dataLen <= 16) return 1
  return Math.ceil(dataLen / 8) - 1
}

function CustomTooltip({
  active,
  payload,
  label,
  granularity,
  period,
  chartTheme,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  granularity: Granularity
  period: Period
  chartTheme: ChartTheme
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl border px-3 py-2.5 text-xs shadow-accent-glow-sm"
      style={{ background: chartTheme.tooltip.bg, borderColor: chartTheme.tooltip.border, color: chartTheme.tooltip.text }}
    >
      <p className="mb-1.5 text-lumen-muted">{label ? formatTick(String(label), granularity, period) : ''}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const chartTheme = useChartTheme()
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!data) return
    setExporting(true)
    try {
      const { generatePdfReport } = await import('@/lib/pdfReport')

      // Fetch supplemental data in parallel for the PDF
      const ageGroup = localStorage.getItem('lumen_age_group') ?? ''
      const [subsRes, insightsRes, ageRes] = await Promise.all([
        fetch('/api/subscriptions').then(r => r.json()).catch(() => ({})),
        fetch('/api/insights').then(r => r.json()).catch(() => ({})),
        ageGroup ? fetch(`/api/insights/age?ageGroup=${encodeURIComponent(ageGroup)}`).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
      ])

      await generatePdfReport(data, period, {
        subscriptions: subsRes.subscriptions ?? [],
        zombies: subsRes.zombies ?? [],
        insights: insightsRes.insights ?? [],
        ageComparisons: ageRes.comparisons ?? [],
        ageGroup: ageGroup || undefined,
      })
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const granularity = getGranularity(period)
    const range = getDateRange(period)
    const cacheKey = `${range ? `${range.from}_${range.to}` : 'all'}_${granularity}`

    const cached = getCachedAnalytics(cacheKey)
    if (cached && Array.isArray(cached.byMonth) && cached.byCategory && Array.isArray(cached.topMerchants)) {
      setData(cached)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    setLoading(true)
    setError(null)
    setData(null)
    const params = new URLSearchParams({ granularity })
    if (range) {
      params.set('from', range.from)
      params.set('to', range.to)
    }

    fetch(`/api/analytics?${params}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const contentType = r.headers.get('content-type') ?? ''
        if (!r.ok) {
          if (r.status === 401) throw new Error('Your session expired. Sign in again to view analytics.')
          throw new Error(`Analytics request failed (${r.status})`)
        }
        if (!contentType.includes('application/json')) {
          throw new Error('Analytics returned a non-JSON response.')
        }
        return r.json()
      })
      .then((d) => {
        if (!Array.isArray(d.byMonth) || !d.byCategory || !Array.isArray(d.topMerchants)) {
          throw new Error(d.error ?? 'Analytics returned an unexpected response.')
        }
        setData(d)
        setCachedAnalytics(cacheKey, d)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load analytics.')
      })
      .finally(() => {
        window.clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [period])

  const granularity = getGranularity(period)
  const interval = xInterval(data?.byMonth.length ?? 0)

  const categoryData = data
    ? Object.entries(data.byCategory)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
    : []

  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0)
  const primaryCategory = categoryData[0]
  const compactCategoryData = (() => {
    if (categoryData.length <= 7) return categoryData
    const visible = categoryData.slice(0, 6)
    const otherValue = categoryData.slice(6).reduce((sum, item) => sum + item.value, 0)
    return otherValue > 0
      ? [...visible, { name: 'Other categories', value: Math.round(otherValue * 100) / 100 }]
      : visible
  })()

  const savingsData = data?.byMonth.map((m) => ({
    month: m.month,
    savings: Math.round((m.income - m.expenses) * 100) / 100,
  })) ?? []
  const netSavingsTotal = savingsData.reduce((sum, item) => sum + item.savings, 0)
  const bestSavings = savingsData.reduce((best, item) => item.savings > best.savings ? item : best, savingsData[0] ?? { month: '', savings: 0 })
  const worstSavings = savingsData.reduce((worst, item) => item.savings < worst.savings ? item : worst, savingsData[0] ?? { month: '', savings: 0 })

  const hasData = !!data && data.totalIncome + data.totalExpenses > 0

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-lumen-text sm:text-4xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-lumen-muted">
            Cash flow, spending by category, savings trend, and top merchants.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          {hasData && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-lumen-border bg-lumen-fill px-4 text-sm font-semibold text-lumen-text transition-colors hover:border-lumen-accent/45 hover:text-lumen-accent disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}

          <div className="-mx-1 flex max-w-full overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max overflow-hidden rounded-2xl border border-lumen-border bg-lumen-fill">
            {PERIODS.map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`min-h-11 shrink-0 px-3 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                  i < PERIODS.length - 1 ? 'border-r border-lumen-border' : ''
                } ${period === key ? 'bg-lumen-accent text-white' : 'text-lumen-muted hover:bg-lumen-fill hover:text-lumen-text'}`}
              >
                {label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lumen-panel flex min-h-[420px] items-center justify-center rounded-[28px]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
        </div>
      ) : error ? (
        <div className="lumen-panel rounded-[28px] p-12 text-center">
          <p className="text-sm font-semibold text-lumen-danger">Analytics failed to load</p>
          <p className="mt-2 text-sm text-lumen-muted">{error}</p>
        </div>
      ) : !hasData ? (
        <div className="lumen-panel rounded-[28px] p-12 text-center">
          <p className="text-sm font-semibold text-lumen-text">No analytics yet</p>
          <p className="mt-2 text-sm text-lumen-muted">Upload a CSV or widen the selected period.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'Income', value: fmt(data.totalIncome), Icon: TrendingUp, tone: 'text-lumen-success', bg: 'bg-lumen-success/10' },
              { label: 'Expenses', value: fmt(data.totalExpenses), Icon: TrendingDown, tone: 'text-lumen-warning', bg: 'bg-lumen-warning/10' },
              { label: 'Net savings', value: fmt(data.netSavings), Icon: WalletCards, tone: data.netSavings >= 0 ? 'text-lumen-success' : 'text-lumen-danger', bg: data.netSavings >= 0 ? 'bg-lumen-success/10' : 'bg-lumen-danger/10' },
            ].map(({ label, value, Icon, tone, bg }) => (
              <div key={label} className="lumen-panel flex items-center justify-between rounded-[24px] p-5">
                <div>
                  <p className="text-sm font-medium text-lumen-muted">{label}</p>
                  <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bg} ${tone}`}>
                  <Icon size={22} />
                </div>
              </div>
            ))}
          </div>

          {data.byMonth.length > 0 && (
            <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-lumen-text">Income vs expenses</h2>
                  <p className="mt-1 text-xs text-lumen-muted">Cash movement over the selected period.</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.byMonth} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(k) => formatTick(k, granularity, period)} interval={interval} tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => shortFmt(Number(v))} axisLine={false} tickLine={false} width={58} />
                  <Tooltip cursor={{ fill: chartTheme.cursor }} content={<CustomTooltip granularity={granularity} period={period} chartTheme={chartTheme} />} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--lumen-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {categoryData.length > 0 && (
              <section className="lumen-panel overflow-hidden rounded-[28px]">
                <div className="flex items-start justify-between gap-4 border-b border-lumen-border px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="text-sm font-semibold text-lumen-text">Spending by category</h2>
                    <p className="mt-1 text-xs text-lumen-muted">Grouped transaction spend.</p>
                  </div>
                  {primaryCategory && (
                    <div className="hidden rounded-2xl bg-lumen-fill-sm px-3 py-2 text-right sm:block">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-lumen-muted">Top category</p>
                      <p className="mt-0.5 max-w-[170px] truncate text-xs font-semibold text-lumen-text">{primaryCategory.name}</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 p-5 lg:grid-cols-[minmax(210px,0.82fr)_minmax(0,1fr)] lg:items-center sm:p-6">
                  <div className="relative mx-auto h-[230px] w-full max-w-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {compactCategoryData.map((d) => {
                            const color = categoryColor(d.name)
                            return (
                              <linearGradient key={d.name} id={`category-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`} x1="0" x2="1" y1="0" y2="1">
                                <stop offset="0%" stopColor={color.text} stopOpacity={0.95} />
                                <stop offset="100%" stopColor={color.text} stopOpacity={0.55} />
                              </linearGradient>
                            )
                          })}
                        </defs>
                        <Pie
                          data={compactCategoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={100}
                          paddingAngle={2}
                          stroke={chartTheme.tooltip.bg}
                          strokeWidth={3}
                        >
                          {compactCategoryData.map((d) => (
                            <Cell key={d.name} fill={`url(#category-${d.name.replace(/[^a-zA-Z0-9]/g, '-')})`} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmt(Number(v))}
                          contentStyle={{ background: chartTheme.tooltip.bg, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: 16, fontSize: 12, color: chartTheme.tooltip.text, boxShadow: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-lumen-muted">Total spend</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-lumen-text">{fmt(categoryTotal)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {compactCategoryData.map((d, i) => {
                      const color = categoryColor(d.name)
                      const pct = categoryTotal > 0 ? (d.value / categoryTotal) * 100 : 0
                      return (
                        <div key={d.name} className="rounded-2xl bg-lumen-fill-sm px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2 text-xs text-lumen-muted">
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: color.bg, color: color.text }}>
                                {i + 1}
                              </span>
                              <span className="truncate" title={d.name}>{d.name}</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-lumen-text">{fmt(d.value)}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lumen-fill">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: color.text }} />
                            </div>
                            <span className="w-10 text-right text-[10px] font-semibold tabular-nums text-lumen-muted">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {savingsData.length > 0 && (
              <section className="lumen-panel overflow-hidden rounded-[28px]">
                <div className="flex flex-col gap-3 border-b border-lumen-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div>
                    <h2 className="text-sm font-semibold text-lumen-text">Net savings trend</h2>
                    <p className="mt-1 text-xs text-lumen-muted">Income minus expenses over time.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:w-[330px]">
                    <div className="rounded-2xl bg-lumen-fill-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-lumen-muted">Net</p>
                      <p className={`mt-0.5 text-xs font-bold tabular-nums ${netSavingsTotal >= 0 ? 'text-lumen-success' : 'text-lumen-danger'}`}>
                        {shortFmt(netSavingsTotal)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-lumen-fill-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-lumen-muted">Best</p>
                      <p className="mt-0.5 text-xs font-bold tabular-nums text-lumen-success">{shortFmt(bestSavings.savings)}</p>
                    </div>
                    <div className="rounded-2xl bg-lumen-fill-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-lumen-muted">Lowest</p>
                      <p className="mt-0.5 text-xs font-bold tabular-nums text-lumen-danger">{shortFmt(worstSavings.savings)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={savingsData} margin={{ top: 10, right: 8, left: -4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="savings-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--lumen-accent)" stopOpacity={0.28} />
                          <stop offset="70%" stopColor="var(--lumen-accent)" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="var(--lumen-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={chartTheme.grid} strokeDasharray="4 8" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={(k) => formatTick(k, granularity, period)} interval={interval} tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => shortFmt(Number(v))} axisLine={false} tickLine={false} width={58} />
                      <ReferenceLine y={0} stroke="rgb(var(--lumen-muted-rgb) / 0.42)" strokeDasharray="5 5" />
                      <Tooltip cursor={{ stroke: 'rgb(var(--lumen-accent-rgb) / 0.35)', strokeWidth: 1 }} content={<CustomTooltip granularity={granularity} period={period} chartTheme={chartTheme} />} />
                      <Area
                        type="monotone"
                        dataKey="savings"
                        name="Net savings"
                        stroke="var(--lumen-accent)"
                        strokeWidth={3}
                        fill="url(#savings-area)"
                        dot={savingsData.length <= 14 ? { r: 4, fill: 'var(--lumen-accent)', stroke: chartTheme.tooltip.bg, strokeWidth: 2 } : false}
                        activeDot={{ r: 6, fill: 'var(--lumen-accent)', stroke: 'rgb(var(--lumen-text-rgb))', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>

          {data.topMerchants.length > 0 && (
            <section className="lumen-panel overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between border-b border-lumen-border px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-lumen-text">Top merchants</h2>
                  <p className="mt-1 text-xs text-lumen-muted">Largest merchants in the selected period.</p>
                </div>
              </div>
              <div className="divide-y divide-lumen-border">
                {data.topMerchants.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-lumen-fill-sm sm:grid-cols-[1fr_120px_140px] sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                        <Store size={18} />
                      </div>
                      <p className="truncate text-sm font-semibold text-lumen-text">{m.description}</p>
                    </div>
                    <p className="hidden text-right text-sm text-lumen-muted sm:block">{m.count} tx</p>
                    <p className="text-right text-sm font-bold tabular-nums text-lumen-text">{fmt(m.total)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SubscriptionTracker />
          <ZombieTracker />
          <AgeComparison />
          <BehavioralInsights />
          <FinancialChat period={period} />
        </div>
      )}
    </div>
  )
}
