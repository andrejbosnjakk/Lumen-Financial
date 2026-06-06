'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  initialProfile: Profile | null
  email: string
}

type Status = { type: 'success' | 'error'; message: string }

function initials(firstName: string, lastName: string, email: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  return email[0]?.toUpperCase() ?? 'L'
}

export default function ProfileForm({ initialProfile, email }: Props) {
  const [firstName, setFirstName] = useState(initialProfile?.first_name ?? '')
  const [lastName, setLastName] = useState(initialProfile?.last_name ?? '')
  const [phone, setPhone] = useState(initialProfile?.phone ?? '')
  const [dob, setDob] = useState(initialProfile?.date_of_birth ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Add your name'
  const avatarLetters = initials(firstName, lastName, email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          date_of_birth: dob || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setStatus({ type: 'success', message: 'Profile updated' })
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="lumen-panel overflow-hidden rounded-[28px]">
      <div className="border-b border-white/[0.07] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[24px] bg-lumen-accent text-xl font-bold text-white shadow-accent-glow-sm">
            {avatarLetters}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-lumen-text">{displayName}</p>
            <p className="truncate text-sm text-lumen-muted">{email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-lumen-text">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-lumen-text">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-lumen-text">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="lumen-input cursor-not-allowed px-4 py-3 text-sm text-lumen-muted opacity-75"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-lumen-text">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12 34 56 78"
              className="lumen-input px-4 py-3 text-sm placeholder:text-lumen-muted/55"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-lumen-text">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="lumen-input px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          {status ? (
            <p className={`text-sm ${status.type === 'success' ? 'text-lumen-success' : 'text-lumen-danger'}`}>
              {status.message}
            </p>
          ) : (
            <p className="text-sm text-lumen-muted">Keep your demo account details tidy.</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-lumen-accent px-4 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
