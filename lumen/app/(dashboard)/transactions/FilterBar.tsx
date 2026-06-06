'use client'

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

export default function FilterBar({
  search, category, dateFrom, dateTo,
  onSearchChange, onCategoryChange, onDateFromChange, onDateToChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        placeholder="Search descriptions…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-48 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
      />
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
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
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
    </div>
  )
}
