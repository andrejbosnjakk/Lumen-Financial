'use client'

import { useEffect, useState } from 'react'
import { Ghost, Loader2 } from 'lucide-react'
import type { ZombieSubscription, Frequency } from '@/lib/types'

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ZombieTracker() {
  const [zombies, setZombies] = useState<ZombieSubscription[]>([])
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
        if (!r.ok) throw new Error(`Subscription check failed (${r.status})`)
        return r.json()
      })
      .then((d) => setZombies(d.zombies ?? []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Subscription check unavailable.')
        setZombies([])
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

  if (!loading && !error && zombies.length === 0) return null

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-3 border-b border-lumen-border px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-warning/10 text-lumen-warning">
          <Ghost size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-lumen-text">Inactive recurring charges</h2>
          <p className="mt-0.5 text-xs text-lumen-muted">Recurring charges that may need review.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-lumen-warning" />
        </div>
      ) : error ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-lumen-danger">{error}</p>
        </div>
      ) : (
        <div className="divide-y divide-lumen-border">
          {zombies.map((z, i) => {
            const isOverdue = z.zombieReason === 'overdue'
            const label = isOverdue
              ? `No charge in ${z.staleDays} days - expected ${FREQ_LABEL[z.frequency].toLowerCase()}`
              : `Small ${FREQ_LABEL[z.frequency].toLowerCase()} charge - ${z.count} months running`
            return (
              <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-lumen-fill-sm sm:grid-cols-[1fr_auto_120px] sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-lumen-text">{z.description}</p>
                  <p className="mt-0.5 text-[11px] text-lumen-muted">{label} - last {fmtDate(z.lastCharge)}</p>
                </div>
                <span className={`hidden rounded-xl px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${isOverdue ? 'bg-lumen-danger/10 text-lumen-danger' : 'bg-lumen-warning/10 text-lumen-warning'}`}>
                  {isOverdue ? 'Overdue' : 'Review'}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-lumen-text">{fmt(z.monthlyEquivalent)}</p>
                  <p className="mt-0.5 text-[10px] text-lumen-muted">per month</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
