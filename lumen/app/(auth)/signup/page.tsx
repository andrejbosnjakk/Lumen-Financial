'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, LineChart, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo, LumenStar } from '@/components/Logo'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      router.push('/login?message=Check+your+email+to+confirm+your+account')
    }
  }

  return (
    <main className="flex min-h-screen bg-lumen-bg">
      <section className="relative hidden min-h-screen overflow-hidden bg-lumen-bg px-12 py-10 lg:flex lg:w-[52%] xl:w-[56%]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(108,99,255,0.24),transparent_34%),radial-gradient(circle_at_82%_82%,rgba(245,158,11,0.12),transparent_28%)]" />
        <div className="absolute inset-y-12 right-0 w-px bg-lumen-border" />

        <div className="relative z-10 flex w-full flex-col justify-between">
          <LumenLogo size={42} />

          <div className="max-w-xl">
            <div className="mb-10 flex h-28 w-28 items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.04] shadow-accent-glow">
              <LumenStar size={78} />
            </div>
            <h1 className="text-5xl font-semibold leading-[1.04] text-lumen-text">
              Turn bank exports into a living money map.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-lumen-muted">
              Lumen makes Revolut data legible for students, makers, and anyone who wants clean answers fast.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              { Icon: UploadCloud, label: 'Upload' },
              { Icon: BadgeCheck, label: 'Clean' },
              { Icon: LineChart, label: 'Understand' },
            ].map(({ Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <Icon className="mb-7 text-lumen-accent" size={22} />
                <p className="text-sm font-semibold text-lumen-text">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(108,99,255,0.12),transparent_34%)] lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[430px]"
        >
          <div className="mb-8 lg:hidden">
            <LumenLogo size={34} />
          </div>

          <div className="lumen-panel rounded-[28px] p-7 sm:p-9">
            <div className="mb-8">
              <p className="text-sm font-medium text-lumen-accent">Start fresh</p>
              <h2 className="mt-2 text-3xl font-semibold text-lumen-text">Create your account</h2>
              <p className="mt-3 text-sm leading-6 text-lumen-muted">
                Set up a workspace for uploads, categories, analytics, and your demo-ready financial overview.
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
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                  placeholder="At least 6 characters"
                />
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
                {loading ? 'Creating account...' : 'Create account'}
                <ArrowRight size={16} />
              </motion.button>
            </form>

            <p className="mt-7 text-center text-sm text-lumen-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-lumen-text transition-colors hover:text-lumen-accent">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
