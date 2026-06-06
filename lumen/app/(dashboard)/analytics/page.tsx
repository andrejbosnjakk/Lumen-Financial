'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import type { AnalyticsData } from '@/lib/types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a3e635']

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = month ? `?month=${month}` : ''
    fetch(`/api/analytics${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month])

  const categoryData = data
    ? Object.entries(data.byCategory).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value)
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
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {month && (
            <button onClick={() => setMonth('')} className="text-sm text-gray-400 hover:text-gray-700">
              All time
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-sm text-gray-400">Loading…</div>
      ) : !data || data.totalIncome + data.totalExpenses === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">No data for this period — upload a CSV first</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Income', value: fmt(data.totalIncome), color: 'text-emerald-600' },
              { label: 'Expenses', value: fmt(data.totalExpenses), color: 'text-gray-900' },
              { label: 'Net Savings', value: fmt(data.netSavings), color: data.netSavings >= 0 ? 'text-emerald-600' : 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className={`text-xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Income vs Expenses bar chart */}
          {data.byMonth.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Income vs Expenses</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byMonth} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
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
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={savingsData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                    <Line type="monotone" dataKey="savings" name="Net Savings" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
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
