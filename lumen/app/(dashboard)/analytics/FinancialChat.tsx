'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Bot, Loader2, Settings2, Sparkles } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Period = 'week' | 'month' | '3months' | 'year' | 'all'

const SUGGESTIONS = [
  'How much did I spend on restaurants this month?',
  'Where should I cut my expenses?',
  'What is my biggest spending category?',
  'Am I saving enough?',
  'How does my spending compare to my income?',
]

interface Props { period: Period }

export default function FinancialChat({ period }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [hasAppFallback, setHasAppFallback] = useState(false)
  const [providerName, setProviderName] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/account/ai-settings')
      .then(r => r.json())
      .then(d => {
        setConfigured(d.configured ?? false)
        setHasAppFallback(d.hasAppFallback ?? false)
        if (d.configured) {
          const names: Record<string, string> = { groq: 'Groq - Llama 3.3', anthropic: 'Claude', openai: 'ChatGPT' }
          setProviderName(names[d.provider] ?? d.provider)
        }
      })
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const question = text.trim()
    if (!question || loading) return

    setInput('')
    setError(null)
    const newMessages: Message[] = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/analytics/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          period,
          history: newMessages.slice(-6, -1),
        }),
      })
      const data = await res.json()
      if (res.status === 402) {
        setQuotaExhausted(true)
        setMessages(prev => prev.slice(0, -1))
        return
      }
      if (res.status === 429) {
        setError(data.error ?? 'Rate limited - wait a moment and try again.')
        setMessages(prev => prev.slice(0, -1))
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  // Not yet loaded
  if (configured === null) return null

  // No own key and no app fallback — truly unavailable
  const aiAvailable = configured || hasAppFallback
  if (!aiAvailable) return (
    <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <Bot size={18} />
          </div>
          <p className="text-sm font-semibold text-lumen-text">Ask AI</p>
        </div>
      </div>
      <div className="rounded-2xl border border-lumen-border bg-lumen-fill-sm p-6 text-center">
        <p className="text-sm font-semibold text-lumen-text">AI assistant unavailable</p>
        <p className="mt-2 text-[13px] text-lumen-muted">
          Add a free{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-lumen-accent hover:underline">Groq</a>
          {' '}key in{' '}
          <Link href="/account" className="text-lumen-accent hover:underline">Account settings</Link>{' '}
          to start asking questions about your finances.
        </p>
      </div>
    </section>
  )

  return (
    <section className="lumen-panel rounded-[28px] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
            <Bot size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-lumen-text">Ask AI</p>
            {configured && providerName && (
              <p className="mt-0.5 text-[11px] text-lumen-muted">Powered by {providerName}</p>
            )}
            {!configured && hasAppFallback && (
              <p className="mt-0.5 text-[11px] text-lumen-muted">Shared Groq key</p>
            )}
          </div>
        </div>
        <Link
          href="/account"
          className="flex items-center gap-1.5 rounded-xl border border-lumen-border px-3 py-1.5 text-[12px] text-lumen-muted hover:text-lumen-text transition-colors"
        >
          <Settings2 size={12} />
          {configured ? 'Change' : 'Add your key'}
        </Link>
      </div>

      {/* Soft nudge when on shared key */}
      {!configured && hasAppFallback && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-lumen-accent/20 bg-lumen-accent/[0.06] px-4 py-3">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-lumen-accent" />
          <p className="text-[12px] text-lumen-muted">
            You&apos;re using Lumen&apos;s shared AI — it works, but may occasionally hit rate limits.{' '}
            <Link href="/account" className="font-medium text-lumen-accent hover:underline">
              Add your own free Groq key
            </Link>{' '}
            for dedicated, unlimited access.
          </p>
        </div>
      )}

      {/* Chat */}
      <div className="space-y-4">
          {/* Suggestions - shown until first message */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="rounded-2xl border border-lumen-border bg-lumen-fill px-3 py-2 text-[12px] text-lumen-muted transition-colors hover:border-lumen-accent/40 hover:text-lumen-text disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      m.role === 'user'
                        ? 'bg-lumen-accent text-white'
                        : 'border border-lumen-border bg-lumen-fill text-lumen-text'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-lumen-border bg-lumen-fill px-4 py-3">
                    <Loader2 size={14} className="animate-spin text-lumen-accent" />
                    <span className="text-[12px] text-lumen-muted">Thinking...</span>
                  </div>
                </div>
              )}
              {error && (
                <p className="text-center text-[12px] text-lumen-danger">{error}</p>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Quota exhausted banner */}
          {quotaExhausted && (
            <div className="rounded-2xl border border-lumen-danger/30 bg-lumen-danger/10 px-4 py-3">
              <p className="text-[12px] font-semibold text-lumen-danger">API quota exhausted</p>
              <p className="mt-1 text-[12px] text-lumen-muted">
                Your provider has no credits left. Add credits or{' '}
                <Link href="/account" className="text-lumen-accent hover:underline">switch providers</Link>{' '}
                in Account settings.
              </p>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={quotaExhausted ? 'API quota exhausted - update your key in Account settings' : 'Ask about your finances...'}
              rows={1}
              disabled={loading || quotaExhausted}
              className="flex-1 resize-none rounded-2xl border border-lumen-border bg-lumen-fill px-4 py-3 text-sm text-lumen-text placeholder:text-lumen-muted/50 focus:border-lumen-accent/50 focus:outline-none disabled:opacity-50"
              style={{ minHeight: 46, maxHeight: 120 }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim() || quotaExhausted}
              className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-2xl bg-lumen-accent text-white transition-colors hover:bg-lumen-accent-dim disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-lumen-muted/60">Enter to send · Shift+Enter for newline</p>
        </div>
    </section>
  )
}
