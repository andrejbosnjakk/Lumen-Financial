'use client'

import type { Transaction } from '@/lib/types'
import CategoryBadge from './CategoryBadge'

interface Props {
  transaction: Transaction
  saving: boolean
  onCategoryChange: (id: string, category: string) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function TransactionRow({ transaction: tx, saving, onCategoryChange }: Props) {
  const isCredit = tx.amount >= 0

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
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
    </tr>
  )
}
