'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

interface Props {
  initialProfile: Profile | null
  email: string
}

type Status = { type: 'success' | 'error'; message: string }

function initials(firstName: string, lastName: string, email: string) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName[0].toUpperCase()
  return email[0].toUpperCase()
}

export default function ProfileForm({ initialProfile, email }: Props) {
  const [firstName, setFirstName] = useState(initialProfile?.first_name ?? '')
  const [lastName, setLastName] = useState(initialProfile?.last_name ?? '')
  const [phone, setPhone] = useState(initialProfile?.phone ?? '')
  const [dob, setDob] = useState(initialProfile?.date_of_birth ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || null
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
    <div className="max-w-lg">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-semibold select-none">
          {avatarLetters}
        </div>
        <div>
          <p className="font-medium text-gray-900">{displayName ?? 'Add your name below'}</p>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-6">Personal information</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12 34 56 78"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {status ? (
              <p className={`text-xs ${status.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                {status.message}
              </p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
