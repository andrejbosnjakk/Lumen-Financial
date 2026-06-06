'use client'

interface Props {
  page: number
  pageSize: number
  count: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, pageSize, count, onPageChange }: Props) {
  const totalPages = Math.ceil(count / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  if (count === 0) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {count} transactions
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
