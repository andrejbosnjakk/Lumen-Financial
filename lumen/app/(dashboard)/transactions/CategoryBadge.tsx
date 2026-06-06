'use client'

import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '@/lib/types'

const COLORS: Record<string, { bg: string; text: string }> = {
  'Groceries':          { bg: 'rgba(16,185,129,0.12)',  text: '#10B981' },
  'Restaurants & Food': { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  'Transport':          { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA' },
  'Entertainment':      { bg: 'rgba(168,85,247,0.12)',  text: '#C084FC' },
  'Utilities':          { bg: 'rgba(99,102,241,0.12)',  text: '#818CF8' },
  'Subscriptions':      { bg: 'rgba(139,92,246,0.12)',  text: '#A78BFA' },
  'Healthcare':         { bg: 'rgba(236,72,153,0.12)',  text: '#F472B6' },
  'Fitness':            { bg: 'rgba(20,184,166,0.12)',  text: '#2DD4BF' },
  'Shopping':           { bg: 'rgba(249,115,22,0.12)',  text: '#FB923C' },
  'Savings':            { bg: 'rgba(16,185,129,0.12)',  text: '#34D399' },
  'Income':             { bg: 'rgba(16,185,129,0.15)',  text: '#10B981' },
  'Transfers':          { bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF' },
  'Housing':            { bg: 'rgba(251,146,60,0.12)',  text: '#FB923C' },
  'Other':              { bg: 'rgba(107,114,128,0.10)', text: '#6B7280' },
  'Uncategorized':      { bg: 'rgba(107,114,128,0.10)', text: '#6B7280' },
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

  const color = COLORS[category] ?? { bg: 'rgba(107,114,128,0.10)', text: '#6B7280' }

  if (editing) {
    return (
      <select
        ref={selectRef}
        defaultValue={category}
        onChange={(e) => { onSelect(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="text-[11px] border border-lumen-border rounded-lg px-2 py-1 bg-lumen-surface-2 text-lumen-text focus:outline-none focus:border-lumen-accent"
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
      style={{ background: color.bg, color: color.text }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-opacity ${
        saving ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
      }`}
    >
      {saving ? 'Saving…' : category}
    </button>
  )
}
