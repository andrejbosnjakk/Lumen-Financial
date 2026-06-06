'use client'

import { useState } from 'react'
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

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

export default function TransactionRow({ transaction: tx, saving, onCategoryChange, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isCredit = tx.amount >= 0

  return (
    <tr className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {formatDate(tx.completed_date)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={tx.description}>
        {tx.description}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {tx.type}
      </td>
      <td className="px-4 py-3">
        <CategoryBadge
          category={tx.category}
          saving={saving}
          onSelect={(cat) => onCategoryChange(tx.id, cat)}
        />
      </td>
      <td className={`px-4 py-3 text-sm font-medium text-right whitespace-nowrap tabular-nums ${
        isCredit ? 'text-emerald-600' : 'text-gray-900'
      }`}>
        {isCredit ? '+' : ''}{tx.amount.toFixed(2)} {tx.currency}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {confirmDelete ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-gray-500">Delete?</span>
            <button
              onClick={() => onDelete(tx.id)}
              className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(tx)}
              title="Edit"
              className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
