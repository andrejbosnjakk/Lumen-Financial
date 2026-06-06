'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PasswordStrengthMeter, { getPasswordStrength } from '@/components/PasswordStrengthMeter'

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (getPasswordStrength(password).score < 3) {
      setMessage({ type: 'error', text: 'Use a stronger password before saving.' })
      return
    }
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated.' })
      setPassword('')
      setConfirm('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-lumen-text">New password</label>
        <input
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-lumen-text">Confirm password</label>
        <input
          type="password"
          placeholder="Repeat new password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
        />
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-lumen-success' : 'text-lumen-danger'}`}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-lumen-accent px-4 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-55"
      >
        <KeyRound size={16} />
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  )
}
