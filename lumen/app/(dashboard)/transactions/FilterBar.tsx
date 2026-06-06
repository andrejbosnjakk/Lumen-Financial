'use client'

import { Search } from 'lucide-react'
import { CATEGORIES } from '@/lib/types'

interface Props {
  search: string
  category: string
  dateFrom: string
  dateTo: string
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
}

const inputCls = 'text-[13px] border border-lumen-border rounded-xl px-3 py-2 bg-lumen-surface-2 text-lumen-text placeholder:text-lumen-muted/50 focus:outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-colors'

export default function FilterBar({
  search, category, dateFrom, dateTo,
  onSearchChange, onCategoryChange, onDateFromChange, onDateToChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="flex-1 min-w-48 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search descriptions…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputCls} pl-9 w-full`}
        />
      </div>
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={inputCls}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className={inputCls}
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className={inputCls}
      />
    </div>
  )
}
