'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Loader2, Repeat2 } from 'lucide-react'
import type { Subscription, Frequency } from '@/lib/types'

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const FREQ_COLOR: Record<Frequency, string> = {
  weekly: 'bg-sky-500/15 text-sky-400',
  monthly: 'bg-lumen-accent/15 text-lumen-accent',
  quarterly: 'bg-violet-500/15 text-violet-400',
  yearly: 'bg-amber-500/15 text-amber-400',
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SubscriptionTracker() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    fetch('/api/subscriptions', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Subscriptions failed (${r.status})`)
        return r.json()
      })
      .then((d) => setSubs(d.subscriptions ?? []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Subscriptions unavailable.')
        setSubs([])
      })
      .finally(() => {
        window.clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const totalMonthly = subs.reduce((sum, s) => sum + s.monthlyEquivalent, 0)

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <Repeat2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-lumen-text">Subscriptions</h2>
            <p className="mt-0.5 text-xs text-lumen-muted">Recurring charges detected from recent history.</p>
          </div>
        </div>
        {!loading && subs.length > 0 && (
          <div className="text-right">
            <p className="text-[11px] text-lumen-muted">Monthly total</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-lumen-text">{fmt(totalMonthly)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-lumen-accent" />
        </div>
      ) : error ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-lumen-danger">{error}</p>
        </div>
      ) : subs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <CalendarCheck size={20} />
          </div>
          <p className="text-sm font-semibold text-lumen-text">No subscriptions detected</p>
          <p className="mt-1 text-sm text-lumen-muted">Recurring charges will appear here once enough history is available.</p>
        </div>
      ) : (
        <div className="divide-y divide-lumen-border">
          {subs.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-lumen-fill-sm sm:grid-cols-[1fr_110px_120px_130px] sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                  <Repeat2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-lumen-text">{s.description}</p>
                  <p className="mt-0.5 text-[11px] text-lumen-muted">
                    {s.count} charges - last {fmtDate(s.lastCharge)}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex sm:justify-center">
                <span className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold ${FREQ_COLOR[s.frequency]}`}>
                  {FREQ_LABEL[s.frequency]}
                </span>
              </div>
              <p className="hidden text-right text-sm text-lumen-muted sm:block">
                {fmt(s.amount)}/charge
              </p>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-lumen-text">{fmt(s.monthlyEquivalent)}</p>
                <p className="mt-0.5 text-[10px] text-lumen-muted">per month</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
