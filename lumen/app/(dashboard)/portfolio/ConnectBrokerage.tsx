'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, Eye, EyeOff, ExternalLink, FileUp, Key, Loader2 } from 'lucide-react'

const inputCls = 'w-full text-[13px] border border-lumen-border rounded-xl px-3 py-2.5 bg-lumen-surface-2 text-lumen-text placeholder:text-lumen-muted/50 focus:outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-colors'

const BROKERS = [
  {
    id: 'trading212' as const,
    name: 'Trading 212',
    description: 'Connect live via API key',
    initial: 'T',
    mode: 'api' as const,
    apiKeyUrl: 'https://app.trading212.com/rest-api',
    placeholder: 'Paste your Trading 212 API key',
  },
  {
    id: 'degiro' as const,
    name: 'DEGIRO',
    description: 'Import via CSV export',
    initial: 'D',
    mode: 'csv' as const,
    howTo: 'Portfolio > Reports > Transactions CSV',
  },
  {
    id: 'ibkr' as const,
    name: 'Interactive Brokers',
    description: 'Import via Activity Statement CSV',
    initial: 'IB',
    mode: 'csv' as const,
    howTo: 'Reports > Activity Statement > CSV (include Open Positions)',
  },
]

type BrokerId = (typeof BROKERS)[number]['id']

export default function ConnectBrokerage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<BrokerId | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const broker = BROKERS.find((b) => b.id === selected)

  function handleSelect(id: BrokerId) {
    setSelected(id); setError(null); setApiKey(''); setFile(null); setFileName(null)
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret || undefined, broker: selected }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Connection failed')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !selected) return
    setError(null)
    setLoading(true)
    const fd = new FormData()
    fd.append('broker', selected)
    fd.append('file', file)
    try {
      const res = await fetch('/api/portfolio/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setFileName(f?.name ?? null)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-lumen-text">Connect your broker</h2>
          <p className="mt-2 text-sm leading-6 text-lumen-muted">
            Link via live API or import a CSV export to see your positions and P&L.
          </p>
        </div>

        <div className="space-y-2.5 mb-6">
          {BROKERS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelect(b.id)}
              className={`w-full flex items-center gap-4 rounded-[20px] border p-4 text-left transition-all ${
                selected === b.id
                  ? 'border-lumen-accent bg-lumen-accent/8 shadow-accent-glow-sm'
                  : 'border-lumen-border bg-lumen-surface hover:border-lumen-accent/30 hover:bg-lumen-surface-2'
              }`}
            >
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${
                selected === b.id ? 'border-lumen-accent/40 bg-lumen-accent/15 text-lumen-accent' : 'border-lumen-border bg-lumen-fill text-lumen-muted'
              }`}>
                {b.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-lumen-text">{b.name}</p>
                <p className="text-[11px] text-lumen-muted mt-0.5">{b.description}</p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {b.mode === 'csv' && (
                  <span className="rounded-full border border-lumen-accent/20 bg-lumen-accent/10 px-2 py-0.5 text-[10px] font-semibold text-lumen-accent">CSV</span>
                )}
                {selected === b.id ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-lumen-accent">
                    <Check size={11} className="text-white" />
                  </div>
                ) : (
                  <ChevronRight size={15} className="text-lumen-muted/40" />
                )}
              </div>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selected && broker && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="lumen-panel rounded-[24px] p-6">
                {broker.mode === 'api' ? (
                  /* -- Trading 212 API key form -- */
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-lumen-muted">API key</label>
                      <div className="relative">
                        <Key size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted" />
                        <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                          placeholder={broker.placeholder} required className={`${inputCls} pl-9 pr-10`} />
                        <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-muted hover:text-lumen-text">
                          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-lumen-muted">
                        API secret
                        <span className="rounded-full bg-lumen-accent/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-lumen-accent">Required for new keys</span>
                      </label>
                      <div className="relative">
                        <Key size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted" />
                        <input type={showSecret ? 'text' : 'password'} value={apiSecret} onChange={e => setApiSecret(e.target.value)}
                          placeholder="Shown once when you generate the key pair" className={`${inputCls} pl-9 pr-10`} />
                        <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-muted hover:text-lumen-text">
                          {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {'apiKeyUrl' in broker && (
                        <a href={broker.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-lumen-accent hover:underline">
                          Generate a new key pair in Trading 212 <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {error && <p className="rounded-xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-[12px] text-lumen-danger">{error}</p>}
                    <motion.button type="submit" disabled={loading || !apiKey.trim()} whileTap={{ scale: 0.98 }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent text-[13px] font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:opacity-50">
                      {loading ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : <>{`Connect ${broker.name}`} <ArrowRight size={15} /></>}
                    </motion.button>
                  </form>
                ) : (
                  /* -- CSV upload form (IBKR / DEGIRO) -- */
                  <form onSubmit={handleUpload} className="space-y-4">
                    {'howTo' in broker && (
                      <p className="rounded-xl border border-lumen-border bg-lumen-fill-sm px-4 py-3 text-[12px] text-lumen-muted">
                        <span className="font-semibold text-lumen-text">How to export: </span>{broker.howTo}
                      </p>
                    )}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-lumen-muted">CSV file</label>
                      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-lumen-border bg-lumen-fill-sm px-4 py-4 text-left text-[13px] transition-colors hover:border-lumen-accent/40 hover:bg-lumen-accent/5">
                        <FileUp size={18} className="flex-shrink-0 text-lumen-accent" />
                        <span className={fileName ? 'text-lumen-text font-medium' : 'text-lumen-muted'}>
                          {fileName ?? 'Click to choose a CSV file...'}
                        </span>
                      </button>
                    </div>
                    {error && <p className="rounded-xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-[12px] text-lumen-danger">{error}</p>}
                    <motion.button type="submit" disabled={loading || !file} whileTap={{ scale: 0.98 }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent text-[13px] font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:opacity-50">
                      {loading ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : <>{`Import ${broker.name}`} <ArrowRight size={15} /></>}
                    </motion.button>
                    <p className="text-center text-[11px] text-lumen-muted/60">
                      Prices are resolved in real-time via Yahoo Finance after upload.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
