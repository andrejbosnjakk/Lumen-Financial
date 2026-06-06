'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CalendarDays, RefreshCw, TrendingUp, Zap } from 'lucide-react'
import type { Insight } from '@/app/api/insights/route'

const ICON: Record<Insight['type'], React.ElementType> = {
  velocity: Zap,
  anomaly: AlertTriangle,
  recurring: RefreshCw,
  savings: TrendingUp,
  pattern: CalendarDays,
  largest: ArrowUpRight,
}

const TONE_CLS: Record<Insight['tone'], { icon: string; badge: string }> = {
  positive: { icon: 'text-lumen-success', badge: 'bg-lumen-success/10 text-lumen-success' },
  warning:  { icon: 'text-lumen-warning', badge: 'bg-lumen-warning/10 text-lumen-warning' },
  danger:   { icon: 'text-lumen-danger',  badge: 'bg-lumen-danger/10 text-lumen-danger' },
  neutral:  { icon: 'text-lumen-accent',  badge: 'bg-lumen-accent/10 text-lumen-accent' },
}

export default function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => { setInsights(d.insights ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="lumen-panel rounded-[24px] p-5">
        <p className="text-sm font-semibold text-lumen-text mb-4">Insights</p>
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
        </div>
      </section>
    )
  }

  if (insights.length === 0) return null

  return (
    <section className="lumen-panel rounded-[24px] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-lumen-text">Insights</p>
          <p className="mt-0.5 text-xs text-lumen-muted">Based on your last 4 months of transactions.</p>
        </div>
        <span className="rounded-full bg-lumen-accent/10 px-2.5 py-0.5 text-xs font-semibold text-lumen-accent">
          {insights.length}
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((ins, i) => {
          const Icon = ICON[ins.type]
          const tone = TONE_CLS[ins.tone]
          return (
            <div key={i} className="flex gap-3 rounded-2xl bg-white/[0.035] p-4">
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ${tone.icon}`}>
                <Icon size={15} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-lumen-text">{ins.title}</p>
                  {ins.value && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                      {ins.value}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-lumen-muted">{ins.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
