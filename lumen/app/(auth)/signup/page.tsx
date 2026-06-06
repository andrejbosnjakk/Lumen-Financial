'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, LineChart, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LumenLogo } from '@/components/Logo'
import PasswordStrengthMeter, { getPasswordStrength } from '@/components/PasswordStrengthMeter'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (getPasswordStrength(password).score < 3) {
      setError('Use a stronger password before creating the account.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const profile = {
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dob || null,
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profile,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.session && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      })
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
          <Link href="/">
            <LumenLogo size={42} />
          </Link>

          <div className="max-w-xl">
            <h1 className="text-5xl font-semibold leading-[1.04] text-lumen-text">
              Understand your finances, clearly.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-lumen-muted">
              Upload a Revolut CSV, get instant categorization, and see exactly where your money goes.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              { Icon: UploadCloud, label: 'Upload' },
              { Icon: BadgeCheck, label: 'Clean' },
              { Icon: LineChart, label: 'Understand' },
            ].map(({ Icon, label }) => (
              <div key={label} className="rounded-2xl border border-lumen-border bg-lumen-fill p-4">
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
          className="relative z-10 w-full max-w-[560px]"
        >
          <div className="mb-8 lg:hidden">
            <Link href="/"><LumenLogo size={34} /></Link>
          </div>

          <div className="lumen-panel rounded-[24px] p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-medium text-lumen-accent">Create account</p>
              <h2 className="mt-2 text-3xl font-semibold text-lumen-text">Create your account</h2>
              <p className="mt-3 text-sm leading-6 text-lumen-muted">
                Add your details so the workspace is ready when you sign in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-lumen-text">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-lumen-text">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                    placeholder="Last name"
                  />
                </div>
              </div>

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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium text-lumen-text">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
                    placeholder="+31 6 12 34 56 78"
                  />
                </div>
                <div>
                  <label htmlFor="dob" className="mb-2 block text-sm font-medium text-lumen-text">
                    Date of birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    autoComplete="bday"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="lumen-input px-4 py-3 text-sm"
                  />
                </div>
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
