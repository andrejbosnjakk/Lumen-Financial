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
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  async function handleLogin(e: React.FormEvent) {
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
    localStorage.setItem('lumen_remember_me', String(rememberMe))
    router.push('/dashboard')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setInfo('Check your email for a password reset link.')
    }
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
        {mode === 'login' ? (
          <>
            <div className="mb-8">
              <p className="text-sm font-medium text-lumen-accent">Welcome back</p>
              <h1 className="mt-2 text-3xl font-semibold text-lumen-text">Sign in to Lumen</h1>
              <p className="mt-3 text-sm leading-6 text-lumen-muted">
                Continue with your transactions, categories, and reports.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-lumen-text">Email</label>
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
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-lumen-text">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null) }}
                    className="text-xs text-lumen-muted transition-colors hover:text-lumen-accent"
                  >
                    Forgot password?
                  </button>
                </div>
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

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border border-lumen-border bg-lumen-fill accent-lumen-accent cursor-pointer"
                />
                <span className="text-sm text-lumen-muted">Remember me for 24 hours</span>
              </label>

              {message && (
                <div className="rounded-2xl border border-lumen-accent/25 bg-lumen-accent/10 px-4 py-3 text-sm text-lumen-text">{message}</div>
              )}
              {error && (
                <div className="rounded-2xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-sm text-lumen-danger">{error}</div>
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
          </>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-sm font-medium text-lumen-accent">Password reset</p>
              <h1 className="mt-2 text-3xl font-semibold text-lumen-text">Reset your password</h1>
              <p className="mt-3 text-sm leading-6 text-lumen-muted">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>
            </div>

            {info ? (
              <div className="rounded-2xl border border-lumen-accent/25 bg-lumen-accent/10 px-4 py-4 text-sm text-lumen-text">
                {info}
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-lumen-text">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-sm text-lumen-danger">{error}</div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lumen-accent px-4 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                  <ArrowRight size={16} />
                </motion.button>
              </form>
            )}

            <p className="mt-7 text-center text-sm text-lumen-muted">
              <button
                onClick={() => { setMode('login'); setError(null); setInfo(null) }}
                className="font-semibold text-lumen-text transition-colors hover:text-lumen-accent"
              >
                Back to sign in
              </button>
            </p>
          </>
        )}
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
            Upload your bank statement and get instant categorization, spending analytics, and clean financial insights.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-2 gap-3">
          <div className="rounded-2xl border border-lumen-border bg-lumen-fill p-4">
            <ShieldCheck className="mb-5 text-lumen-accent" size={22} />
            <p className="text-sm font-semibold text-lumen-text">Private by design</p>
            <p className="mt-1 text-sm leading-5 text-lumen-muted">Row-level security - your data is visible only to you.</p>
          </div>
          <div className="rounded-2xl border border-lumen-border bg-lumen-fill p-4">
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
