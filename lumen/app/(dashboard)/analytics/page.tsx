'use client'

import { useEffect, useState } from 'react'
import { Download, Store, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import FinancialChat from './FinancialChat'
import SubscriptionTracker from './SubscriptionTracker'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsData } from '@/lib/types'
import { getCachedAnalytics, setCachedAnalytics } from '@/lib/analyticsCache'

const COLORS = ['var(--lumen-accent)', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']

const CHART_THEME = {
  grid: 'rgba(247,246,242,0.08)',
  axis: '#6B7280',
  tooltip: { bg: '#141622', border: 'rgba(247,246,242,0.1)', text: '#F7F6F2' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
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
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  granularity: Granularity
  period: Period
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border px-3 py-2.5 text-xs shadow-accent-glow-sm" style={{ background: CHART_THEME.tooltip.bg, borderColor: CHART_THEME.tooltip.border }}>
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
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!data) return
    setExporting(true)
    try {
      const { generatePdfReport } = await import('@/lib/pdfReport')
      await generatePdfReport(data, period)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const granularity = getGranularity(period)
    const range = getDateRange(period)
    const cacheKey = `${range ? `${range.from}_${range.to}` : 'all'}_${granularity}`

    const cached = getCachedAnalytics(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    const params = new URLSearchParams({ granularity })
    if (range) {
      params.set('from', range.from)
      params.set('to', range.to)
    }

    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setCachedAnalytics(cacheKey, d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period])

  const granularity = getGranularity(period)
  const interval = xInterval(data?.byMonth.length ?? 0)

  const categoryData = data
    ? Object.entries(data.byCategory)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
    : []

  const savingsData = data?.byMonth.map((m) => ({
    month: m.month,
    savings: Math.round((m.income - m.expenses) * 100) / 100,
  })) ?? []

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {hasData && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-lumen-text transition-colors hover:border-lumen-accent/45 hover:text-lumen-accent disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}

          <div className="flex overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            {PERIODS.map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`min-h-11 px-3 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                  i < PERIODS.length - 1 ? 'border-r border-white/[0.08]' : ''
                } ${period === key ? 'bg-lumen-accent text-white' : 'text-lumen-muted hover:bg-white/[0.05] hover:text-lumen-text'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lumen-panel flex min-h-[420px] items-center justify-center rounded-[28px]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.byMonth} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(k) => formatTick(k, granularity, period)} interval={interval} tick={{ fontSize: 11, fill: CHART_THEME.axis }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_THEME.axis }} tickFormatter={(v) => `EUR ${v}`} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<CustomTooltip granularity={granularity} period={period} />} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--lumen-accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {categoryData.length > 0 && (
              <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-lumen-text">Spending by category</h2>
                <p className="mt-1 text-xs text-lumen-muted">Grouped transaction spend.</p>
                <ResponsiveContainer width="100%" height={265}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={3}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(Number(v))}
                      contentStyle={{ background: CHART_THEME.tooltip.bg, border: `1px solid ${CHART_THEME.tooltip.border}`, borderRadius: 16, fontSize: 12, color: CHART_THEME.tooltip.text }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categoryData.slice(0, 6).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.035] px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-lumen-muted">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="text-xs font-semibold text-lumen-text">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {savingsData.length > 0 && (
              <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-lumen-text">Net savings trend</h2>
                <p className="mt-1 text-xs text-lumen-muted">Income minus expenses over time.</p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={savingsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                    <XAxis dataKey="month" tickFormatter={(k) => formatTick(k, granularity, period)} interval={interval} tick={{ fontSize: 11, fill: CHART_THEME.axis }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_THEME.axis }} tickFormatter={(v) => `EUR ${v}`} axisLine={false} tickLine={false} width={62} />
                    <Tooltip content={<CustomTooltip granularity={granularity} period={period} />} />
                    <Line type="monotone" dataKey="savings" name="Net savings" stroke="var(--lumen-accent)" strokeWidth={3} dot={savingsData.length <= 14 ? { r: 3, fill: 'var(--lumen-accent)' } : false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}
          </div>

          {data.topMerchants.length > 0 && (
            <section className="lumen-panel overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-lumen-text">Top merchants</h2>
                  <p className="mt-1 text-xs text-lumen-muted">Largest merchants in the selected period.</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {data.topMerchants.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.035] sm:grid-cols-[1fr_120px_140px] sm:px-6">
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
          <FinancialChat period={period} />
        </div>
      )}
    </div>
  )
}
