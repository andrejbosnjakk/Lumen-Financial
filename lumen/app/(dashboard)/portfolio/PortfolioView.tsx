'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, RefreshCw, TrendingUp, Unlink, Wallet } from 'lucide-react'
import type { PortfolioData } from '@/lib/types'

function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

function cleanTicker(raw: string) {
  return raw.split('_')[0]
}

export default function PortfolioView({ accountType }: { accountType: 'live' | 'demo' }) {
  const router = useRouter()
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(silent ? '/api/portfolio/data?refresh=1' : '/api/portfolio/data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load portfolio')
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDisconnect() {
    if (!confirm('Disconnect Trading 212? Your transaction history is unaffected.')) return
    setDisconnecting(true)
    await fetch('/api/portfolio/connect', { method: 'DELETE' })
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-lumen-danger">{error}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load()}
            className="rounded-xl border border-lumen-border px-4 py-2 text-[13px] text-lumen-muted hover:text-lumen-text"
          >
            Retry
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-xl border border-lumen-danger/30 px-4 py-2 text-[13px] text-lumen-danger hover:bg-lumen-danger/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { positions, cash } = data
  const totalValue = cash.total
  const invested = cash.invested
  const unrealizedPnl = cash.ppl
  const unrealizedPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0
  const freeCash = cash.free

  const sortedPositions = [...positions].sort(
    (a, b) => b.quantity * b.currentPrice - a.quantity * a.currentPrice
  )

  const statCards = [
    {
      label: 'Portfolio value',
      value: fmt(totalValue),
      sub: null,
      Icon: Wallet,
      tone: 'text-lumen-text',
      bg: 'bg-white/[0.06]',
    },
    {
      label: 'Invested',
      value: fmt(invested),
      sub: null,
      Icon: TrendingUp,
      tone: 'text-lumen-accent',
      bg: 'bg-lumen-accent/10',
    },
    {
      label: 'Unrealized P&L',
      value: fmt(unrealizedPnl),
      sub: fmtPct(unrealizedPct),
      Icon: unrealizedPnl >= 0 ? ArrowUpRight : ArrowDownRight,
      tone: unrealizedPnl >= 0 ? 'text-lumen-success' : 'text-lumen-danger',
      bg: unrealizedPnl >= 0 ? 'bg-lumen-success/10' : 'bg-lumen-danger/10',
    },
    {
      label: 'Available cash',
      value: fmt(freeCash),
      sub: null,
      Icon: Wallet,
      tone: 'text-lumen-warning',
      bg: 'bg-lumen-warning/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-lumen-text">Portfolio</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              accountType === 'live' ? 'bg-lumen-success/10 text-lumen-success' : 'bg-lumen-warning/10 text-lumen-warning'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${accountType === 'live' ? 'bg-lumen-success' : 'bg-lumen-warning'}`} />
              Trading 212 · {accountType === 'live' ? 'Live' : 'Demo'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-lumen-border px-3 text-[12px] font-medium text-lumen-muted hover:border-lumen-accent/40 hover:text-lumen-text disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-lumen-danger/30 px-3 text-[12px] font-medium text-lumen-danger hover:bg-lumen-danger/10 disabled:opacity-50"
          >
            <Unlink size={13} />
            Disconnect
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, sub, Icon, tone, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lumen-panel rounded-[22px] p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium text-lumen-muted">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${tone}`}>
                <Icon size={15} />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
            {sub && (
              <p className={`mt-1 text-[12px] font-semibold ${tone}`}>{sub}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Positions */}
      <div className="lumen-panel overflow-hidden rounded-[24px]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <p className="text-sm font-semibold text-lumen-text">
            Positions
            <span className="ml-2 text-xs font-normal text-lumen-muted">{positions.length} open</span>
          </p>
        </div>

        {positions.length === 0 ? (
          <div className="p-12 text-center text-sm text-lumen-muted">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-lumen-border bg-lumen-surface-2">
                  {['Ticker', 'Quantity', 'Avg cost', 'Current', 'Market value', 'P&L', 'P&L %'].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-lumen-muted ${
                        h === 'Ticker' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((pos, i) => {
                  const marketValue = pos.quantity * pos.currentPrice
                  const costBasis = pos.quantity * pos.averagePrice
                  const pnl = pos.ppl + pos.fxPpl
                  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
                  const positive = pnl >= 0

                  return (
                    <motion.tr
                      key={pos.ticker}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      className="border-b border-lumen-border/50 last:border-0 hover:bg-lumen-surface-2 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-semibold text-lumen-text">{cleanTicker(pos.ticker)}</p>
                        <p className="text-[11px] text-lumen-muted/60 truncate max-w-[120px]">{pos.ticker}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-lumen-muted">
                        {pos.quantity.toLocaleString('nl-NL', { maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-lumen-muted">
                        {fmt(pos.averagePrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-lumen-text font-medium">
                        {fmt(pos.currentPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums font-semibold text-lumen-text">
                        {fmt(marketValue)}
                      </td>
                      <td className={`px-5 py-3.5 text-right text-[13px] tabular-nums font-semibold ${positive ? 'text-lumen-success' : 'text-lumen-danger'}`}>
                        {positive ? '+' : ''}{fmt(pnl)}
                      </td>
                      <td className={`px-5 py-3.5 text-right ${positive ? 'text-lumen-success' : 'text-lumen-danger'}`}>
                        <span className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          positive ? 'bg-lumen-success/10' : 'bg-lumen-danger/10'
                        }`}>
                          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {Math.abs(pnlPct).toFixed(2)}%
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
