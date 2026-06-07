'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Info, Loader2, Sparkles, Trash2 } from 'lucide-react'

type Provider = 'groq' | 'anthropic' | 'openai'

const PROVIDERS: { id: Provider; name: string; model: string; description: string; link: string; linkLabel: string; free?: boolean }[] = [
  {
    id: 'groq',
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Llama 3.3 70B on Groq infrastructure. Blazing fast, completely free tier.',
    link: 'https://console.groq.com/keys',
    linkLabel: 'console.groq.com',
    free: true,
  },
  {
    id: 'anthropic',
    name: 'Claude',
    model: 'claude-haiku-4-5',
    description: 'By Anthropic. Fast, accurate, great at financial reasoning.',
    link: 'https://console.anthropic.com/settings/keys',
    linkLabel: 'console.anthropic.com',
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    model: 'gpt-4o-mini',
    description: 'By OpenAI. Familiar, capable, widely used.',
    link: 'https://platform.openai.com/api-keys',
    linkLabel: 'platform.openai.com',
  },
]

export default function AiProviderForm() {
  const [provider, setProvider] = useState<Provider>('groq')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch('/api/account/ai-settings')
      .then(r => r.json())
      .then(d => {
        if (d.configured) {
          setProvider(d.provider)
          setMaskedKey(d.maskedKey)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/account/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMaskedKey(`...${apiKey.trim().slice(-4)}`)
      setApiKey('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Remove your key? The AI assistant will fall back to the shared Groq key.')) return
    setRemoving(true)
    await fetch('/api/account/ai-settings', { method: 'DELETE' })
    setMaskedKey(null)
    setApiKey('')
    setRemoving(false)
  }

  const selected = PROVIDERS.find(p => p.id === provider)!

  return (
    <div className="space-y-4">
      {/* Shared key notice — shown until user adds their own */}
      {!maskedKey && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-lumen-accent/20 bg-lumen-accent/[0.06] px-4 py-3">
          <Info size={13} className="mt-0.5 shrink-0 text-lumen-accent" />
          <p className="text-[12px] text-lumen-muted">
            The AI chat already works using Lumen&apos;s shared Groq key. Adding your own key gives you dedicated access and avoids occasional rate limits — Groq&apos;s free tier is generous.
          </p>
        </div>
      )}

      {/* Provider picker */}
      <div className="grid grid-cols-3 gap-3">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              provider === p.id
                ? 'border-lumen-accent/60 bg-lumen-accent/10'
                : 'border-lumen-border bg-lumen-fill-sm hover:border-lumen-accent/30'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <p className={`text-sm font-semibold ${provider === p.id ? 'text-lumen-accent' : 'text-lumen-text'}`}>
                {p.name}
              </p>
              {p.free && (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  FREE
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-lumen-muted">{p.model}</p>
          </button>
        ))}
      </div>

      <p className="text-[12px] text-lumen-muted">{selected.description}</p>

      {/* API key input */}
      {maskedKey ? (
        <div className="flex items-center justify-between rounded-2xl border border-lumen-border bg-lumen-fill px-4 py-3">
          <div>
            <p className="text-[11px] text-lumen-muted">{selected.name} API key</p>
            <p className="mt-0.5 font-mono text-sm text-lumen-text">{maskedKey}</p>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-1.5 rounded-xl border border-lumen-danger/30 px-3 py-1.5 text-[12px] text-lumen-danger hover:bg-lumen-danger/10 disabled:opacity-50"
          >
            {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={`Paste your ${selected.name} API key`}
              className="w-full rounded-2xl border border-lumen-border bg-lumen-fill px-4 py-3 pr-11 font-mono text-sm text-lumen-text placeholder:text-lumen-muted/50 focus:border-lumen-accent/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-muted hover:text-lumen-text"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-lumen-muted">
            Get your key at{' '}
            <a href={selected.link} target="_blank" rel="noopener noreferrer" className="text-lumen-accent hover:underline">
              {selected.linkLabel}
            </a>
            . The key is stored securely and only used for your requests.
          </p>
        </div>
      )}

      {!maskedKey && (
        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent text-sm font-semibold text-white transition-colors hover:bg-lumen-accent-dim disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {saving ? 'Saving...' : 'Save my key'}
        </button>
      )}

      {status === 'saved' && (
        <p className="text-center text-[12px] text-lumen-success">AI assistant configured.</p>
      )}
      {status === 'error' && (
        <p className="text-center text-[12px] text-lumen-danger">{errorMsg}</p>
      )}
    </div>
  )
}
