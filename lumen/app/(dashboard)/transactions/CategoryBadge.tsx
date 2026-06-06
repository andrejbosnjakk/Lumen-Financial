'use client'

import { useEffect, useRef, useState } from 'react'
import { categoryColor } from '@/lib/categoryColors'

interface Props {
  category: string
  saving: boolean
  onSelect: (category: string) => void
}

export default function CategoryBadge({ category, saving, onSelect }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(category)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(category)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [category, editing])

  function commit() {
    const next = draft.trim() || 'Uncategorized'
    if (next !== category) onSelect(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="h-7 w-56 rounded-lg border border-lumen-border bg-lumen-surface-2 px-2 text-[11px] text-lumen-text focus:border-lumen-accent focus:outline-none"
      />
    )
  }

  const color = categoryColor(category)

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
