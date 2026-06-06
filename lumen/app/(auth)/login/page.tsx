'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo } from '@/components/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[430px]"
    >
      <div className="mb-8 lg:hidden">
        <Link href="/"><LumenLogo size={34} /></Link>
      </div>

      <div className="lumen-panel rounded-[28px] p-7 sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-medium text-lumen-accent">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold text-lumen-text">Sign in to Lumen</h1>
          <p className="mt-3 text-sm leading-6 text-lumen-muted">
            Continue with your transactions, categories, and reports.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-lumen-text">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-lumen-text">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
              placeholder="Enter your password"
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-lumen-accent/25 bg-lumen-accent/10 px-4 py-3 text-sm text-lumen-text">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-sm text-lumen-danger">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent px-4 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </motion.button>
        </form>

        <p className="mt-7 text-center text-sm text-lumen-muted">
          New to Lumen?{' '}
          <Link href="/signup" className="font-semibold text-lumen-text transition-colors hover:text-lumen-accent">
            Create an account
          </Link>
        </p>
      </div>
    </motion.div>
  )
}

function AuthVisual() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-lumen-bg px-12 py-10 lg:flex lg:w-[52%] xl:w-[56%]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(108,99,255,0.24),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_28%)]" />
      <div className="absolute inset-y-12 right-0 w-px bg-lumen-border" />

      <div className="relative z-10 flex w-full flex-col justify-between">
        <Link href="/">
          <LumenLogo size={42} />
        </Link>

        <div className="max-w-xl">
          <h2 className="text-5xl font-semibold leading-[1.04] text-lumen-text">
            Financial clarity,<br />illuminated.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-lumen-muted">
            Upload your Revolut CSV and get instant categorization, spending analytics, and clean financial insights.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <ShieldCheck className="mb-5 text-lumen-accent" size={22} />
            <p className="text-sm font-semibold text-lumen-text">Private by design</p>
            <p className="mt-1 text-sm leading-5 text-lumen-muted">Row-level security — your data is visible only to you.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <BarChart2 className="mb-5 text-lumen-accent" size={22} />
            <p className="text-sm font-semibold text-lumen-text">Instant insights</p>
            <p className="mt-1 text-sm leading-5 text-lumen-muted">Category breakdown, cash flow, and PDF export.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-lumen-bg">
      <AuthVisual />
      <section className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(108,99,255,0.12),transparent_34%)] lg:hidden" />
        <div className="relative z-10 flex w-full justify-center">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
