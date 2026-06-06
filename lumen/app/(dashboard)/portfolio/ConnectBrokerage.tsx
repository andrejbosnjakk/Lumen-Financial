'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, Eye, EyeOff, ExternalLink, Key } from 'lucide-react'

const inputCls = 'w-full text-[13px] border border-lumen-border rounded-xl px-3 py-2.5 bg-lumen-surface-2 text-lumen-text placeholder:text-lumen-muted/50 focus:outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-colors'

const BROKERS = [
  {
    id: 'trading212' as const,
    name: 'Trading 212',
    description: 'Stocks, ETFs & fractional shares',
    initial: 'T',
    available: true,
    apiKeyUrl: 'https://app.trading212.com/rest-api',
    placeholder: 'Paste your Trading 212 API key',
  },
  {
    id: 'degiro' as const,
    name: 'DEGIRO',
    description: 'European discount broker',
    initial: 'D',
    available: false,
  },
  {
    id: 'ibkr' as const,
    name: 'Interactive Brokers',
    description: 'Professional trading platform',
    initial: 'IB',
    available: false,
  },
]

type BrokerId = (typeof BROKERS)[number]['id']

export default function ConnectBrokerage() {
  const router = useRouter()
  const [selected, setSelected] = useState<BrokerId | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const broker = BROKERS.find((b) => b.id === selected)

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
            Link a brokerage account to view positions, P&L, and available cash.
          </p>
        </div>

        <div className="space-y-2.5 mb-6">
          {BROKERS.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={!b.available}
              onClick={() => { setSelected(b.id); setError(null); setApiKey('') }}
              className={`w-full flex items-center gap-4 rounded-[20px] border p-4 text-left transition-all ${
                !b.available
                  ? 'border-lumen-border opacity-40 cursor-not-allowed'
                  : selected === b.id
                  ? 'border-lumen-accent bg-lumen-accent/8 shadow-accent-glow-sm'
                  : 'border-lumen-border bg-lumen-surface hover:border-white/20 hover:bg-lumen-surface-2'
              }`}
            >
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${
                selected === b.id ? 'border-lumen-accent/40 bg-lumen-accent/15 text-lumen-accent' : 'border-white/10 bg-white/[0.04] text-lumen-muted'
              }`}>
                {b.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-lumen-text">{b.name}</p>
                <p className="text-[11px] text-lumen-muted mt-0.5">{b.description}</p>
              </div>
              <div className="flex-shrink-0">
                {!b.available ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-lumen-muted/60 uppercase tracking-wider">
                    Soon
                  </span>
                ) : selected === b.id ? (
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

        <AnimatePresence>
          {selected && broker?.available && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="lumen-panel rounded-[24px] p-6">
                <form onSubmit={handleConnect} className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-lumen-muted">
                      API key
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted">
                        <Key size={14} />
                      </div>
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={broker.placeholder}
                        required
                        className={`${inputCls} pl-9 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-muted hover:text-lumen-text"
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* API Secret */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-lumen-muted">
                      API secret
                      <span className="rounded-full bg-lumen-accent/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-lumen-accent">
                        Required for new keys
                      </span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted">
                        <Key size={14} />
                      </div>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Shown once when you generate the key pair"
                        className={`${inputCls} pl-9 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-muted hover:text-lumen-text"
                      >
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {broker.apiKeyUrl && (
                      <a
                        href={broker.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-lumen-accent hover:underline"
                      >
                        Generate a new key pair in Trading 212
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {error && (
                    <p className="rounded-xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-[12px] text-lumen-danger">
                      {error}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !apiKey.trim()}
                    whileTap={{ scale: 0.98 }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent text-[13px] font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:opacity-50"
                  >
                    {loading ? 'Connecting...' : `Connect ${broker.name}`} 
                    {!loading && <ArrowRight size={15} />}
                  </motion.button>
                </form>
              </div>

              <p className="mt-3 text-center text-[11px] text-lumen-muted/60">
                Your API key is stored securely and never shared.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
