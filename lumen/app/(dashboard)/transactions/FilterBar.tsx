'use client'

import { Search } from 'lucide-react'

interface Props {
  search: string
  category: string
  categories: string[]
  dateFrom: string
  dateTo: string
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
}

const inputCls = 'h-11 min-w-0 text-[13px] border border-lumen-border rounded-xl px-3 py-2 bg-lumen-surface-2 text-lumen-text placeholder:text-lumen-muted/50 focus:outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-colors'

export default function FilterBar({
  search, category, categories, dateFrom, dateTo,
  onSearchChange, onCategoryChange, onDateFromChange, onDateToChange,
}: Props) {
  const options = category && !categories.includes(category)
    ? [category, ...categories]
    : categories

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_180px_180px]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search descriptions..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputCls} pl-9 w-full`}
        />
      </div>
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={`${inputCls} w-full`}
      >
        <option value="">All categories</option>
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className={`${inputCls} w-full`}
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className={`${inputCls} w-full`}
      />
    </div>
  )
}
