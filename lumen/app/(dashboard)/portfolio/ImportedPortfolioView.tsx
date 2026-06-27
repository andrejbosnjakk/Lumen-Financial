'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw, Trash2, TrendingUp, Upload, Wallet } from 'lucide-react'
import type { BrokerImport, ImportedPosition } from '@/app/api/portfolio/imported/route'
import PortfolioCharts, { type ChartPosition } from './PortfolioCharts'
import RiskBreakdown, { type RiskPosition } from './RiskBreakdown'

const BROKER_LABEL: Record<string, string> = { ibkr: 'Interactive Brokers', degiro: 'DEGIRO' }

function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}
function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PriceSourceBadge({ source }: { source: ImportedPosition['priceSource'] }) {
  if (source === 'live') return (
    <span className="ml-1.5 rounded-md bg-lumen-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-lumen-success">LIVE</span>
  )
  if (source === 'statement') return (
    <span className="ml-1.5 rounded-md bg-lumen-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-lumen-warning">STMT</span>
  )
  return (
    <span className="ml-1.5 rounded-md bg-lumen-fill px-1.5 py-0.5 text-[10px] font-semibold text-lumen-muted">COST</span>
  )
}

function ImportCard({ imp, onRemove }: { imp: BrokerImport; onRemove: (broker: string) => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const positive = imp.totalPnl >= 0

  async function handleReupload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('broker', imp.broker)
    fd.append('file', file)
    try {
      const res = await fetch('/api/portfolio/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      router.refresh()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${BROKER_LABEL[imp.broker] ?? imp.broker} import? This cannot be undone.`)) return
    setRemoving(true)
    await fetch('/api/portfolio/imported', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ broker: imp.broker }) })
    onRemove(imp.broker)
  }

  const statCards = [
    { label: 'Portfolio value', value: fmt(imp.totalValue), Icon: Wallet, tone: 'text-lumen-text', bg: 'bg-lumen-fill' },
    { label: 'Invested',        value: fmt(imp.totalCost),  Icon: TrendingUp, tone: 'text-lumen-accent', bg: 'bg-lumen-accent/10' },
    {
      label: 'Unrealized P&L',
      value: fmt(imp.totalPnl),
      sub: fmtPct(imp.totalPnlPct),
      Icon: positive ? ArrowUpRight : ArrowDownRight,
      tone: positive ? 'text-lumen-success' : 'text-lumen-danger',
      bg: positive ? 'bg-lumen-success/10' : 'bg-lumen-danger/10',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-lumen-text">{BROKER_LABEL[imp.broker] ?? imp.broker}</h2>
            <span className="rounded-full bg-lumen-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-lumen-accent">CSV Import</span>
          </div>
          <p className="mt-0.5 text-[12px] text-lumen-muted">
            {imp.filename} - imported {fmtDate(imp.importedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleReupload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || removing}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-lumen-border px-3 text-[12px] font-medium text-lumen-muted hover:border-lumen-accent/40 hover:text-lumen-text disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Re-upload
          </button>
          <button
            onClick={handleRemove}
            disabled={removing || uploading}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-lumen-danger/30 px-3 text-[12px] font-medium text-lumen-danger hover:bg-lumen-danger/10 disabled:opacity-50"
          >
            {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Remove
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="rounded-xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-[12px] text-lumen-danger">{uploadError}</p>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, sub, Icon, tone, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="lumen-panel rounded-[22px] p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium text-lumen-muted">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${tone}`}><Icon size={15} /></div>
            </div>
            <p className={`mt-3 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
            {sub && <p className={`mt-1 text-[12px] font-semibold ${tone}`}>{sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <PortfolioCharts positions={imp.positions.map((pos): ChartPosition => ({
        label: pos.yahooTicker ?? pos.symbol,
        marketValue: pos.marketValue,
        pnl: pos.pnl,
      }))} />

      {/* Risk breakdown */}
      <RiskBreakdown positions={imp.positions.map((pos): RiskPosition => ({
        ticker: pos.yahooTicker ?? pos.symbol,
        marketValue: pos.marketValue,
        currency: pos.currency,
      }))} />

      {/* Positions table */}
      <div className="lumen-panel overflow-hidden rounded-[24px]">
        <div className="border-b border-lumen-border px-5 py-4">
          <p className="text-sm font-semibold text-lumen-text">
            Positions
            <span className="ml-2 text-xs font-normal text-lumen-muted">{imp.positions.length} open</span>
          </p>
        </div>
        {imp.positions.length === 0 ? (
          <div className="p-12 text-center text-sm text-lumen-muted">No open positions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-lumen-border bg-lumen-surface-2">
                  {['Symbol', 'Qty', 'Avg cost', 'Current', 'Market value', 'P&L', 'P&L %'].map(h => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-lumen-muted ${h === 'Symbol' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...imp.positions].sort((a, b) => b.marketValue - a.marketValue).map((pos, i) => {
                  const pos_ = pos.pnl >= 0
                  return (
                    <motion.tr
                      key={pos.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.08 + i * 0.03 }}
                      className="border-b border-lumen-border/50 last:border-0 hover:bg-lumen-surface-2 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-lumen-text">
                            {pos.yahooTicker ?? pos.symbol}
                          </p>
                          <PriceSourceBadge source={pos.priceSource} />
                        </div>
                        <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-lumen-muted/60">{pos.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-lumen-muted">
                        {pos.quantity.toLocaleString('nl-NL', { maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-lumen-muted">
                        {fmt(pos.avgCost, pos.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums font-medium text-lumen-text">
                        {fmt(pos.currentPrice, pos.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums font-semibold text-lumen-text">
                        {fmt(pos.marketValue, pos.currency)}
                      </td>
                      <td className={`px-5 py-3.5 text-right text-[13px] tabular-nums font-semibold ${pos_ ? 'text-lumen-success' : 'text-lumen-danger'}`}>
                        {pos_ ? '+' : ''}{fmt(pos.pnl, pos.currency)}
                      </td>
                      <td className={`px-5 py-3.5 text-right ${pos_ ? 'text-lumen-success' : 'text-lumen-danger'}`}>
                        <span className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${pos_ ? 'bg-lumen-success/10' : 'bg-lumen-danger/10'}`}>
                          {pos_ ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {Math.abs(pos.pnlPct).toFixed(2)}%
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

export default function ImportedPortfolioView() {
  const router = useRouter()
  const [imports, setImports] = useState<BrokerImport[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/imported')
      const d = await res.json()
      setImports(d.imports ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleRemove(broker: string) {
    setImports(prev => prev.filter(i => i.broker !== broker))
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
      </div>
    )
  }

  if (imports.length === 0) return null

  return (
    <div className="space-y-10">
      {imports.map(imp => (
        <ImportCard key={imp.id} imp={imp} onRemove={handleRemove} />
      ))}
    </div>
  )
}

/** Small upload widget shown as an "Add broker" card when imports already exist. */
export function AddImportCard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [broker, setBroker] = useState<'ibkr' | 'degiro'>('ibkr')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('broker', broker)
    fd.append('file', file)
    try {
      const res = await fetch('/api/portfolio/import', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Upload failed')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="lumen-panel rounded-[24px] p-5 sm:p-6">
      <p className="mb-4 text-sm font-semibold text-lumen-text">Add another broker</p>
      <div className="flex flex-wrap items-center gap-3">
        {(['ibkr', 'degiro'] as const).map(b => (
          <button
            key={b}
            onClick={() => setBroker(b)}
            className={`rounded-2xl border px-4 py-2 text-[12px] font-semibold transition-colors ${
              broker === b ? 'border-lumen-accent/60 bg-lumen-accent/10 text-lumen-accent' : 'border-lumen-border text-lumen-muted hover:border-lumen-accent/30'
            }`}
          >
            {BROKER_LABEL[b]}
          </button>
        ))}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-2xl bg-lumen-accent px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-lumen-accent-dim disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? 'Processing...' : 'Upload CSV'}
        </button>
      </div>
      {error && <p className="mt-3 text-[12px] text-lumen-danger">{error}</p>}
    </div>
  )
}
