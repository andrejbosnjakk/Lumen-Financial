'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import type { AgeComparison } from '@/lib/types'

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+']
const STORAGE_KEY = 'lumen_age_group'

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function AgeComparison() {
  const [ageGroup, setAgeGroup] = useState<string>('')
  const [comparisons, setComparisons] = useState<AgeComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && AGE_GROUPS.includes(saved)) setAgeGroup(saved)
  }, [])

  useEffect(() => {
    if (!ageGroup) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    localStorage.setItem(STORAGE_KEY, ageGroup)
    setLoading(true)
    setError(null)

    fetch(`/api/insights/age?ageGroup=${encodeURIComponent(ageGroup)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Peer comparison failed (${r.status})`)
        return r.json()
      })
      .then((d) => setComparisons(d.comparisons ?? []))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Peer comparison timed out.')
        } else {
          setError(err instanceof Error ? err.message : 'Peer comparison failed.')
        }
        setComparisons([])
      })
      .finally(() => {
        window.clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [ageGroup])

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">Peer comparison</h2>
            <p className="mt-0.5 text-xs text-lumen-muted">Compares your category spend to age-group benchmarks.</p>
          </div>
        </div>

        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          className="rounded-xl border border-white/10 bg-lumen-surface-2 px-3 py-2 text-xs font-semibold text-lumen-text focus:outline-none focus:ring-2 focus:ring-lumen-accent/40"
        >
          <option value="">Select your age group</option>
          {AGE_GROUPS.map((g) => (
            <option key={g} value={g}>{g} years</option>
          ))}
        </select>
      </div>

      {!ageGroup ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-lumen-muted">Choose an age group to compare spending by category.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
        </div>
      ) : error ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-lumen-danger">{error}</p>
        </div>
      ) : comparisons.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-lumen-muted">Not enough matching category data yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.07]">
          {comparisons.slice(0, 8).map((c, i) => {
            const pct = Math.round((c.ratio - 1) * 100)
            const isOver = c.direction === 'over'
            const isUnder = c.direction === 'under'
            const barWidth = Math.min(Math.abs(pct), 100)
            return (
              <div key={i} className="px-5 py-4 sm:px-6">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-lumen-text">{c.category}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-lumen-muted">You: {fmt(c.userMonthly)}/mo - Avg: {fmt(c.benchmarkMonthly)}/mo</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isOver ? 'bg-lumen-danger/10 text-lumen-danger' : isUnder ? 'bg-lumen-success/10 text-lumen-success' : 'bg-lumen-accent/10 text-lumen-accent'}`}>
                      {pct > 0 ? '+' : ''}{pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${isOver ? 'bg-lumen-danger' : isUnder ? 'bg-lumen-success' : 'bg-lumen-accent'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
