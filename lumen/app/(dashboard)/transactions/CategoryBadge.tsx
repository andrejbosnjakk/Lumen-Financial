'use client'

import { useEffect, useRef, useState } from 'react'
import { categoryColor } from '@/lib/categoryColors'
import { useColorMode } from '@/lib/useColorMode'
import { CATEGORIES } from '@/lib/categories'

interface Props {
  category: string
  saving: boolean
  onSelect: (category: string) => void
}

export default function CategoryBadge({ category, saving, onSelect }: Props) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)
  const mode = useColorMode()

  useEffect(() => {
    if (editing) selectRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <select
        ref={selectRef}
        defaultValue={category}
        onChange={(e) => { onSelect(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="h-7 rounded-lg border border-lumen-border bg-lumen-surface-2 px-2 text-[11px] text-lumen-text focus:border-lumen-accent focus:outline-none"
      >
        {CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    )
  }

  const color = categoryColor(category, mode)

  return (
    <button
      onClick={() => setEditing(true)}
      disabled={saving}
      title={category}
      style={{ background: color.bg, borderColor: color.border, color: color.text }}
      className={`inline-flex max-w-[260px] items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-opacity ${
        saving ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:opacity-80'
      }`}
    >
      <span className="truncate">{saving ? 'Saving...' : category}</span>
    </button>
  )
}
