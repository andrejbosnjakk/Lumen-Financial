'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import CategoryBadge from './CategoryBadge'

interface Props {
  transaction: Transaction
  saving: boolean
  onCategoryChange: (id: string, category: string) => void
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TransactionCard({ transaction: tx, saving, onCategoryChange, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isCredit = tx.amount >= 0

  return (
    <article className="rounded-2xl border border-lumen-border bg-lumen-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-lumen-text">{tx.description}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-lumen-muted/70">{tx.type}</p>
        </div>
        <p className={`shrink-0 text-right text-sm font-bold tabular-nums ${isCredit ? 'text-lumen-success' : 'text-lumen-text'}`}>
          {isCredit ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <CategoryBadge
            category={tx.category}
            saving={saving}
            onSelect={(cat) => onCategoryChange(tx.id, cat)}
          />
        </div>
        <p className="shrink-0 text-xs text-lumen-muted">{formatDate(tx.completed_date)}</p>
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t border-lumen-border pt-3">
        {confirmDelete ? (
          <>
            <span className="mr-auto text-[11px] text-lumen-muted">Delete this transaction?</span>
            <button onClick={() => onDelete(tx.id)} className="text-xs font-semibold text-lumen-danger">
              Yes
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold text-lumen-muted">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(tx)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-lumen-muted hover:bg-lumen-fill hover:text-lumen-text"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-lumen-muted hover:bg-lumen-danger/10 hover:text-lumen-danger"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  )
}
