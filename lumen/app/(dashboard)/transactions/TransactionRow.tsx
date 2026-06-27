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
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function TransactionRow({ transaction: tx, saving, onCategoryChange, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isCredit = tx.amount >= 0

  return (
    <tr className="group border-b border-lumen-border last:border-0 hover:bg-lumen-surface-2 transition-colors">
      <td className="px-4 py-3 text-[12px] text-lumen-muted whitespace-nowrap">
        {formatDate(tx.completed_date)}
      </td>
      <td className="px-4 py-3 text-[13px] text-lumen-text max-w-xs truncate font-medium" title={tx.description}>
        {tx.description}
      </td>
      <td className="px-4 py-3 text-[11px] text-lumen-muted/60 whitespace-nowrap uppercase tracking-wide">
        {tx.type}
      </td>
      <td className="px-4 py-3">
        <CategoryBadge
          category={tx.category}
          saving={saving}
          onSelect={(cat) => onCategoryChange(tx.id, cat)}
        />
      </td>
      <td className={`px-4 py-3 text-[13px] font-semibold text-right whitespace-nowrap tabular-nums ${
        isCredit ? 'text-lumen-success' : 'text-lumen-text'
      }`}>
        {isCredit ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {confirmDelete ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-lumen-muted">Delete?</span>
            <button
              onClick={() => onDelete(tx.id)}
              className="text-[11px] font-medium text-lumen-danger transition-colors hover:text-lumen-danger/80"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] text-lumen-muted hover:text-lumen-text transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(tx)}
              title="Edit"
              className="p-1.5 text-lumen-muted hover:text-lumen-text hover:bg-lumen-border rounded-lg transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-1.5 text-lumen-muted hover:text-lumen-danger hover:bg-lumen-danger/10 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
