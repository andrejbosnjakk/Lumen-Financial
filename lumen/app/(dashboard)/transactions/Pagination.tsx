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
      <p className="text-[12px] text-lumen-muted">
        Showing {from}-{to} of {count} transactions
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-[12px] border border-lumen-border rounded-lg bg-lumen-surface text-lumen-muted disabled:opacity-30 hover:bg-lumen-surface-2 hover:text-lumen-text transition-colors"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-[12px] border border-lumen-border rounded-lg bg-lumen-surface text-lumen-muted disabled:opacity-30 hover:bg-lumen-surface-2 hover:text-lumen-text transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
