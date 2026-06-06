'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useChartTheme } from '@/lib/useChartTheme'

export type ChartPosition = {
  label: string
  marketValue: number
  pnl: number
}

const COLORS = [
  'var(--lumen-accent)', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#A855F7', '#6366F1',
]

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function PortfolioCharts({ positions }: { positions: ChartPosition[] }) {
  const chartTheme = useChartTheme()
  if (positions.length === 0) return null

  const totalValue = positions.reduce((s, p) => s + p.marketValue, 0)

  // Donut: top 9 by value, rest grouped as "Other"
  const bySizeDesc = [...positions].sort((a, b) => b.marketValue - a.marketValue)
  const top = bySizeDesc.slice(0, 9)
  const otherValue = bySizeDesc.slice(9).reduce((s, p) => s + p.marketValue, 0)
  const donutData = [
    ...top.map(p => ({ name: p.label, value: Math.round(p.marketValue * 100) / 100 })),
    ...(otherValue > 0 ? [{ name: 'Other', value: Math.round(otherValue * 100) / 100 }] : []),
  ]

  // Waterfall: all positions sorted best → worst P&L
  const waterfallData = [...positions]
    .sort((a, b) => b.pnl - a.pnl)
    .map(p => ({ name: p.label, pnl: Math.round(p.pnl * 100) / 100 }))

  const barHeight = Math.min(Math.max(waterfallData.length * 36 + 48, 220), 480)

  return (
    <div className="grid gap-5 xl:grid-cols-2">

      {/* ── Allocation donut ── */}
      <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-lumen-text">Allocation</h2>
        <p className="mt-1 text-xs text-lumen-muted">Portfolio weight by position.</p>

        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={90}
              paddingAngle={3}
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
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

        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {donutData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.035] px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-xs text-lumen-muted">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="tabular-nums text-xs font-semibold text-lumen-text">
                {totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── P&L waterfall ── */}
      <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-lumen-text">P&L by position</h2>
        <p className="mt-1 text-xs text-lumen-muted">Unrealized gain / loss per holding.</p>

        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart
            data={waterfallData}
            layout="vertical"
            margin={{ left: 4, right: 20, top: 16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: chartTheme.axis }}
              tickFormatter={v => `€${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <ReferenceLine x={0} stroke={chartTheme.reference} />
            <Tooltip
              formatter={(v) => [fmt(Number(v)), 'P&L']}
              contentStyle={{
                background: chartTheme.tooltip.bg,
                border: `1px solid ${chartTheme.tooltip.border}`,
                borderRadius: 16,
                fontSize: 12,
                color: chartTheme.tooltip.text,
              }}
              cursor={{ fill: chartTheme.cursor }}
            />
            <Bar dataKey="pnl" radius={[0, 5, 5, 0]} maxBarSize={22}>
              {waterfallData.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? '#10B981' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

    </div>
  )
}
