'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo } from '@/components/Logo'
import PasswordStrengthMeter, { getPasswordStrength } from '@/components/PasswordStrengthMeter'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sends ?code=... - exchange it for a session
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError('This reset link has expired. Please request a new one.')
      else setReady(true)
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (getPasswordStrength(password).score < 3) {
      setError('Use a stronger password.')
      return
    }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
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
      <div className="mb-8">
        <Link href="/"><LumenLogo size={34} /></Link>
      </div>

      <div className="lumen-panel rounded-[28px] p-7 sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-medium text-lumen-accent">Password reset</p>
          <h1 className="mt-2 text-3xl font-semibold text-lumen-text">Set a new password</h1>
          <p className="mt-3 text-sm leading-6 text-lumen-muted">
            Choose a strong password for your Lumen account.
          </p>
        </div>

        {error && !ready ? (
          <>
            <div className="rounded-2xl border border-lumen-danger/25 bg-lumen-danger/10 px-4 py-3 text-sm text-lumen-danger">
              {error}
            </div>
            <p className="mt-6 text-center text-sm text-lumen-muted">
              <Link href="/login" className="font-semibold text-lumen-text transition-colors hover:text-lumen-accent">
                Back to sign in
              </Link>
            </p>
          </>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-lumen-text">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                placeholder="At least 8 characters"
              />
              <PasswordStrengthMeter password={password} />
            </div>

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
              {loading ? 'Updating...' : 'Set new password'}
              <ArrowRight size={16} />
            </motion.button>
          </form>
        ) : (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-lumen-accent/30 border-t-lumen-accent" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-lumen-bg px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(108,99,255,0.12),transparent_34%)]" />
      <div className="relative z-10 flex w-full justify-center">
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  )
}
