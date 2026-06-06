'use client'

import { useEffect, useState } from 'react'
import { generatePdfReport } from '@/lib/pdfReport'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid,
} from 'recharts'
import type { AnalyticsData } from '@/lib/types'
import { getCachedAnalytics, setCachedAnalytics } from '@/lib/analyticsCache'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a3e635']

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

type Period = 'week' | 'month' | '3months' | 'year' | 'all'
type Granularity = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: '3months', label: '3 Months' },
  { key: 'year',    label: 'Year' },
  { key: 'all',     label: 'All time' },
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

// Format a period key for X-axis display
function formatTick(key: string, granularity: Granularity, period: Period): string {
  if (granularity === 'month') {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  }
  // key is YYYY-MM-DD for day and week granularity
  const d = new Date(key + 'T12:00:00')
  if (granularity === 'week') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  // day granularity
  if (period === 'week') {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// How many X-axis ticks to skip so labels don't overlap
function xInterval(dataLen: number): number {
  if (dataLen <= 10) return 0
  if (dataLen <= 16) return 1
  return Math.ceil(dataLen / 8) - 1
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
  const tickFormatter = (key: string) => formatTick(key, granularity, period)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>

        <div className="flex items-center gap-3">
          {data && data.totalIncome + data.totalExpenses > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Exporting…' : '↓ Export PDF'}
            </button>
          )}

          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
          {PERIODS.map(({ key, label }, i) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                i < PERIODS.length - 1 ? 'border-r border-gray-200' : ''
              } ${
                period === key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-sm text-gray-400">Loading…</div>
      ) : !data || data.totalIncome + data.totalExpenses === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">No data for this period — upload a CSV or try a wider range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Income',      value: fmt(data.totalIncome),   color: 'text-emerald-600' },
              { label: 'Expenses',    value: fmt(data.totalExpenses),  color: 'text-gray-900' },
              { label: 'Net Savings', value: fmt(data.netSavings),     color: data.netSavings >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className={`text-xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Income vs Expenses */}
          {data.byMonth.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Income vs Expenses</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byMonth} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={tickFormatter}
                    interval={interval}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(v) => `€${v}`}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    labelFormatter={(key) => formatTick(String(key), granularity, period)}
                  />
                  <Legend />
                  <Bar dataKey="income"   name="Income"   fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Spending by category donut */}
            {categoryData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Spending by Category</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Net savings trend */}
            {savingsData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Net Savings Trend</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={savingsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={tickFormatter}
                      interval={interval}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(v) => `€${v}`}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v) => fmt(Number(v))}
                      labelFormatter={(key) => formatTick(String(key), granularity, period)}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Net Savings"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={savingsData.length <= 14 ? { r: 3, fill: '#6366f1' } : false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top merchants */}
          {data.topMerchants.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Top Merchants</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Merchant</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Transactions</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topMerchants.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-900">{m.description}</td>
                      <td className="px-5 py-3 text-sm text-gray-400 text-right">{m.count}</td>
                      <td className="px-5 py-3 text-sm font-medium text-right tabular-nums text-gray-900">{fmt(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
