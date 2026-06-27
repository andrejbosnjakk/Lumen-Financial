'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Droplets, CalendarDays, Target, Zap,
} from 'lucide-react'
import type { BehavioralInsightsData } from '@/lib/types'
import { useChartTheme, type ChartTheme } from '@/lib/useChartTheme'

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

// ── Small Leaks ───────────────────────────────────────────────────────────────
function SmallLeaks({ data }: { data: BehavioralInsightsData['smallLeaks'] }) {
  if (data.count === 0) return null
  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-start gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
          <Droplets size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-lumen-text">Small Leaks</h2>
          <p className="mt-0.5 text-xs text-lumen-muted">Transactions under €10 this month — invisible individually, surprising collectively.</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-semibold tabular-nums text-amber-400">{fmt(data.total)}</p>
          <p className="text-[11px] text-lumen-muted">{data.count} transactions</p>
        </div>
      </div>
      <div className="divide-y divide-lumen-border">
        {data.topCategories.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between px-5 py-3 sm:px-6">
            <div>
              <p className="text-sm text-lumen-text">{cat.category}</p>
              <p className="text-[11px] text-lumen-muted">{cat.count} charge{cat.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-lumen-text">{fmt(cat.total)}</p>
              <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-lumen-fill">
                <div
                  className="h-full rounded-full bg-amber-400/60"
                  style={{ width: `${Math.min((cat.total / data.total) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Category Drift ────────────────────────────────────────────────────────────
function CategoryDrift({ data, chartTheme }: { data: BehavioralInsightsData['categoryDrift']; chartTheme: ChartTheme }) {
  if (data.length === 0) return null
  const maxBar = Math.max(...data.map(d => Math.max(d.currentMonthly, d.avgMonthly)))
  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-start gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
          <Zap size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-lumen-text">Category Drift</h2>
          <p className="mt-0.5 text-xs text-lumen-muted">This month vs your 3-month average — categories that moved significantly.</p>
        </div>
      </div>
      <div className="divide-y divide-lumen-border">
        {data.slice(0, 6).map((item) => {
          const isUp = item.direction === 'up'
          const Icon = isUp ? TrendingUp : TrendingDown
          const colorCls = isUp ? 'text-lumen-danger' : 'text-lumen-success'
          const bgCls = isUp ? 'bg-lumen-danger/10' : 'bg-lumen-success/10'
          const barColor = isUp ? '#EF4444' : '#10B981'
          return (
            <div key={item.category} className="px-5 py-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${bgCls} ${colorCls}`}>
                    <Icon size={13} />
                  </div>
                  <p className="text-sm font-medium text-lumen-text truncate">{item.category}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${bgCls} ${colorCls}`}>
                  {isUp ? '+' : ''}{item.deltaPct}%
                </span>
              </div>
              <div className="space-y-1.5 pl-[38px]">
                {[
                  { label: 'This month', value: item.currentMonthly, color: barColor },
                  { label: '3-mo avg',   value: item.avgMonthly,     color: chartTheme.reference },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <p className="w-20 text-[11px] text-lumen-muted shrink-0">{label}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-lumen-fill overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(value / maxBar) * 100}%`, background: color }}
                      />
                    </div>
                    <p className="w-16 text-right text-[11px] tabular-nums text-lumen-muted shrink-0">{fmt(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Annual Projection ─────────────────────────────────────────────────────────
function AnnualProjection({ data }: { data: BehavioralInsightsData['annualProjection'] }) {
  if (data.length === 0) return null
  const rows = data.slice(0, 7)
  const total = data.reduce((s, d) => s + d.annualProjected, 0)
  const maxVal = Math.max(...rows.map(d => d.annualProjected))
  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-start justify-between gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
            <Target size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">Annual Burn Rate</h2>
            <p className="mt-0.5 text-xs text-lumen-muted">At your current pace, here is what you will spend this year.</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-semibold tabular-nums text-violet-400">{fmt(total)}</p>
          <p className="text-[11px] text-lumen-muted">projected total</p>
        </div>
      </div>
      <div className="divide-y divide-lumen-border">
        {rows.map((item, i) => {
          const barColor = `hsl(${260 + i * 15}, 70%, 65%)`
          const pct = (item.annualProjected / maxVal) * 100
          return (
            <div key={item.category} className="px-5 py-3.5 sm:px-6">
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="min-w-0 truncate text-sm text-lumen-text" title={item.category}>{item.category}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-[11px] text-lumen-muted/60">{fmt(item.monthlyAvg)}/mo</p>
                  <p className="w-24 text-right text-sm font-semibold tabular-nums text-lumen-text">{fmt(item.annualProjected)}</p>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-lumen-fill">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Payday Splurge ────────────────────────────────────────────────────────────
function PaydaySplurge({
  data,
  salaryDesc,
  candidates,
  onSalaryChange,
}: {
  data: BehavioralInsightsData['paydaySplurge']
  salaryDesc: string | null
  candidates: BehavioralInsightsData['incomeCandidates']
  onSalaryChange: (desc: string | null) => void
}) {
  const [picking, setPicking] = useState(false)
  const isSplurger = !!data && data.ratio >= 1.3

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isSplurger ? 'bg-orange-500/10 text-orange-400' : 'bg-lumen-accent/10 text-lumen-accent'}`}>
          <CalendarDays size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-lumen-text">Payday Spending Pattern</h2>
          <p className="mt-0.5 text-xs text-lumen-muted">
            {salaryDesc
              ? `Tracking the 7 days after "${salaryDesc}" arrives.`
              : 'Using all income over €200 as payday signals — pin your salary for accuracy.'}
          </p>
        </div>
        {isSplurger && !picking && (
          <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-400">
            {data!.ratio}× spike
          </span>
        )}
      </div>

      {/* Salary picker */}
      <div className="border-b border-lumen-border px-5 py-3 sm:px-6">
        {!picking ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-lumen-muted">Salary source:</span>
              {salaryDesc
                ? <span className="truncate text-[12px] font-medium text-lumen-text">{salaryDesc}</span>
                : <span className="text-[12px] text-lumen-muted/60 italic">not set</span>
              }
            </div>
            <button
              onClick={() => setPicking(true)}
              className="shrink-0 rounded-xl border border-lumen-border px-3 py-1.5 text-[12px] font-medium text-lumen-muted transition-colors hover:border-lumen-accent/40 hover:text-lumen-accent"
            >
              {salaryDesc ? 'Change' : 'Set salary'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-lumen-text">Select your salary transaction:</p>
              <button onClick={() => setPicking(false)} className="text-[11px] text-lumen-muted hover:text-lumen-text">Cancel</button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 rounded-2xl border border-lumen-border bg-lumen-fill-sm p-2">
              {candidates.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-lumen-muted">No income transactions found in the last 6 months.</p>
              )}
              {candidates.map((c) => (
                <button
                  key={c.description}
                  onClick={() => { onSalaryChange(c.description); setPicking(false) }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-lumen-fill ${salaryDesc === c.description ? 'bg-lumen-accent/10 ring-1 ring-lumen-accent/30' : ''}`}
                >
                  <span className="min-w-0 truncate text-sm text-lumen-text">{c.description}</span>
                  <span className="ml-3 shrink-0 text-[12px] text-lumen-muted">
                    {fmt(c.avgAmount)} · {c.count}×
                  </span>
                </button>
              ))}
              {salaryDesc && (
                <button
                  onClick={() => { onSalaryChange(null); setPicking(false) }}
                  className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-[12px] text-lumen-danger/70 transition-colors hover:bg-lumen-danger/5 hover:text-lumen-danger"
                >
                  Clear salary setting
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {!data ? (
        <div className="px-5 py-8 text-center sm:px-6">
          <p className="text-sm text-lumen-muted">
            {salaryDesc
              ? `No transactions matching "${salaryDesc}" found in the last 6 months.`
              : 'No income events detected. Set your salary above to enable this insight.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 divide-x divide-lumen-border p-5 sm:p-6">
            <div className="pr-5 sm:pr-6">
              <p className="text-[11px] text-lumen-muted mb-1">7 days after payday</p>
              <p className={`text-2xl font-semibold tabular-nums ${isSplurger ? 'text-orange-400' : 'text-lumen-text'}`}>
                {fmt(data.avgDailyPostPayday)}
              </p>
              <p className="text-xs text-lumen-muted mt-0.5">avg / day</p>
              <p className="mt-3 text-xs text-lumen-muted/70">{fmt(data.paydayWindowTotal)} over {data.paydayWindowDays} days</p>
            </div>
            <div className="pl-5 sm:pl-6">
              <p className="text-[11px] text-lumen-muted mb-1">Rest of the period</p>
              <p className="text-2xl font-semibold tabular-nums text-lumen-text">
                {fmt(data.avgDailyOther)}
              </p>
              <p className="text-xs text-lumen-muted mt-0.5">avg / day</p>
              <p className="mt-3 text-xs text-lumen-muted/70">{fmt(data.otherWindowTotal)} over {data.otherWindowDays} days</p>
            </div>
          </div>
          {isSplurger && (
            <div className="border-t border-lumen-border px-5 py-3 sm:px-6">
              <p className="text-xs text-lumen-muted/70">
                <span className="font-medium text-orange-400">Tip:</span> Set a 7-day post-payday budget. Most of the variance happens in this window.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ── Essential vs Discretionary ────────────────────────────────────────────────
function EssentialRatio({ data, chartTheme }: { data: BehavioralInsightsData['essentialRatio']; chartTheme: ChartTheme }) {
  if (data.length < 2) return null
  const latest = data[data.length - 1]
  const chartData = data.map(m => ({ ...m, month: fmtMonth(m.month) }))
  const discPct = 100 - latest.essentialPct
  const isDiscretionaryHeavy = discPct > 55

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-start justify-between gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isDiscretionaryHeavy ? 'bg-lumen-warning/10 text-lumen-warning' : 'bg-lumen-success/10 text-lumen-success'}`}>
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">Needs vs Wants</h2>
            <p className="mt-0.5 text-xs text-lumen-muted">Essential (groceries, transport, utilities, health) vs discretionary spending over time.</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xl font-semibold tabular-nums ${isDiscretionaryHeavy ? 'text-lumen-warning' : 'text-lumen-success'}`}>
            {discPct}%
          </p>
          <p className="text-[11px] text-lumen-muted">discretionary</p>
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <div className="mb-1 flex justify-between text-[11px] text-lumen-muted">
          <span>Essential {latest.essentialPct}%</span>
          <span>Wants {discPct}%</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <div className="bg-lumen-success/70 transition-all duration-700" style={{ width: `${latest.essentialPct}%` }} />
          <div className="flex-1 bg-lumen-warning/50" />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEssential" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="gradDiscretionary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={v => `€${v}`} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--lumen-accent-rgb) / 0.35)', strokeWidth: 1 }}
              formatter={(v, name) => [fmt(Number(v)), String(name)]}
              contentStyle={{ background: chartTheme.tooltip.bg, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: 16, fontSize: 12, color: chartTheme.tooltip.text, boxShadow: 'none' }}
              labelStyle={{ color: chartTheme.tooltip.text, fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="essentialTotal"     name="Essential" stroke="#10B981" fill="url(#gradEssential)"     strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="discretionaryTotal" name="Wants"     stroke="#F59E0B" fill="url(#gradDiscretionary)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-lumen-success/70" /><p className="text-[11px] text-lumen-muted">Essential</p></div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-400/70"    /><p className="text-[11px] text-lumen-muted">Wants</p></div>
        </div>
      </div>
    </section>
  )
}

const SALARY_KEY = 'lumen_salary_desc'

// ── Root component ────────────────────────────────────────────────────────────
export default function BehavioralInsights() {
  const chartTheme = useChartTheme()
  const [salaryDesc, setSalaryDesc] = useState<string | null>(null)
  const [data, setData] = useState<BehavioralInsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Load saved salary on mount
  useEffect(() => {
    const saved = localStorage.getItem(SALARY_KEY)
    if (saved) setSalaryDesc(saved)
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = salaryDesc
      ? `/api/insights/behavioral?salaryDesc=${encodeURIComponent(salaryDesc)}`
      : '/api/insights/behavioral'
    fetch(url)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [salaryDesc])

  function handleSalaryChange(desc: string | null) {
    if (desc) localStorage.setItem(SALARY_KEY, desc)
    else localStorage.removeItem(SALARY_KEY)
    setSalaryDesc(desc)
  }

  if (loading) {
    return (
      <div className="lumen-panel flex min-h-[120px] items-center justify-center rounded-[28px]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
      </div>
    )
  }

  if (!data) return null

  const hasAny =
    data.smallLeaks.count > 0 ||
    data.categoryDrift.length > 0 ||
    data.annualProjection.length > 0 ||
    data.incomeCandidates.length > 0 ||
    data.paydaySplurge !== null ||
    data.essentialRatio.length >= 2

  if (!hasAny) return null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-lumen-text">Smart Insights</h2>
        <p className="mt-1 text-sm text-lumen-muted">Patterns your bank does not show you.</p>
      </div>
      <SmallLeaks data={data.smallLeaks} />
      <CategoryDrift data={data.categoryDrift} chartTheme={chartTheme} />
      <AnnualProjection data={data.annualProjection} />
      <PaydaySplurge
        data={data.paydaySplurge}
        salaryDesc={salaryDesc}
        candidates={data.incomeCandidates}
        onSalaryChange={handleSalaryChange}
      />
      <EssentialRatio data={data.essentialRatio} chartTheme={chartTheme} />
    </div>
  )
}
