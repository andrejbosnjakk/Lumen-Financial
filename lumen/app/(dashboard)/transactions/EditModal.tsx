'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { CATEGORIES } from '@/lib/categories'

interface Props {
  transaction: Transaction
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>
  onClose: () => void
}

const inputCls = 'w-full text-[13px] border border-lumen-border rounded-xl px-3 py-2.5 bg-lumen-surface-2 text-lumen-text placeholder:text-lumen-muted/50 focus:outline-none focus:border-lumen-accent focus:ring-1 focus:ring-lumen-accent transition-colors'
const labelCls = 'block text-[11px] font-medium text-lumen-muted mb-1.5 uppercase tracking-wider'

export default function EditModal({ transaction, onSave, onClose }: Props) {
  const [description, setDescription] = useState(transaction.description)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [currency, setCurrency] = useState(transaction.currency)
  const [type, setType] = useState(transaction.type)
  const [completedDate, setCompletedDate] = useState(
    transaction.completed_date.split('T')[0].split(' ')[0]
  )
  const [category, setCategory] = useState(transaction.category)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSave(transaction.id, {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        type,
        completed_date: completedDate,
        category,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-lumen-surface border border-lumen-border rounded-2xl p-6 w-full max-w-md"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-lumen-text">Edit transaction</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-lumen-muted hover:text-lumen-text hover:bg-lumen-surface-2 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  maxLength={3}
                  required
                  className={`${inputCls} uppercase`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-[12px] text-lumen-danger">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-[13px] border border-lumen-border rounded-xl text-lumen-muted hover:bg-lumen-surface-2 hover:text-lumen-text transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={saving}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold bg-lumen-accent text-white rounded-xl hover:bg-lumen-accent-dim disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
