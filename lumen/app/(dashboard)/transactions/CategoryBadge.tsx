'use client'

import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '@/lib/types'

const COLORS: Record<string, string> = {
  Groceries: 'bg-green-100 text-green-700',
  Transport: 'bg-blue-100 text-blue-700',
  Subscriptions: 'bg-purple-100 text-purple-700',
  Housing: 'bg-orange-100 text-orange-700',
  Dining: 'bg-amber-100 text-amber-700',
  Health: 'bg-red-100 text-red-700',
  Income: 'bg-emerald-100 text-emerald-700',
  Savings: 'bg-teal-100 text-teal-700',
  Uncategorized: 'bg-gray-100 text-gray-400',
}

interface Props {
  category: string
  saving: boolean
  onSelect: (category: string) => void
}

export default function CategoryBadge({ category, saving, onSelect }: Props) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) selectRef.current?.focus()
  }, [editing])

  const color = COLORS[category] ?? 'bg-gray-100 text-gray-500'

  if (editing) {
    return (
      <select
        ref={selectRef}
        defaultValue={category}
        onChange={(e) => {
          onSelect(e.target.value)
          setEditing(false)
        }}
        onBlur={() => setEditing(false)}
        className="text-xs border border-gray-300 rounded-md px-1 py-0.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      disabled={saving}
      title="Click to edit category"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-opacity ${color} ${
        saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
      }`}
    >
      {saving ? 'Saving…' : category}
    </button>
  )
}
