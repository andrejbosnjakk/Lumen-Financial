'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Transaction } from '@/lib/types'
import FilterBar from './FilterBar'
import TransactionRow from './TransactionRow'
import Pagination from './Pagination'
import CsvUploadButton from './CsvUploadButton'
import EditModal from './EditModal'

const PAGE_SIZE = 50

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (category) params.set('category', category)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    try {
      const res = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setTransactions(json.data ?? [])
      setCount(json.count ?? 0)
      setCategoryOptions(Array.isArray(json.categories) ? json.categories : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, category, dateFrom, dateTo])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 300)
  }

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (val: T) => {
      setter(val)
      setPage(1)
    }
  }

  async function handleCategoryChange(id: string, newCategory: string) {
    const prev = transactions.find((t) => t.id === id)?.category
    setSavingId(id)
    setTransactions((ts) => ts.map((t) => (t.id === id ? { ...t, category: newCategory } : t)))

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      })
      if (!res.ok) throw new Error()
    } catch {
      if (prev !== undefined) {
        setTransactions((ts) => ts.map((t) => (t.id === id ? { ...t, category: prev } : t)))
      }
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    setTransactions((ts) => ts.filter((t) => t.id !== id))
    setCount((c) => c - 1)

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      // Revert by refetching
      fetchTransactions()
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true)
    try {
      const res = await fetch('/api/transactions', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setTransactions([])
      setCount(0)
      setPage(1)
    } catch {
      fetchTransactions()
    } finally {
      setDeletingAll(false)
      setConfirmDeleteAll(false)
    }
  }

  async function handleEditSave(id: string, updates: Partial<Transaction>) {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to update')

    setTransactions((ts) => ts.map((t) => (t.id === id ? { ...t, ...json.data } : t)))
    setEditingTx(null)
  }

  const hasActiveFilters = debouncedSearch || category || dateFrom || dateTo

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-lumen-text sm:text-4xl">Transactions</h1>
          {count > 0 && (
            <p className="mt-2 text-sm leading-6 text-lumen-muted">{count} total</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="px-3 py-1.5 text-[13px] font-medium text-lumen-danger border border-lumen-danger/40 rounded-lg hover:bg-lumen-danger/10 transition-colors"
            >
              Delete All
            </button>
          )}
          <CsvUploadButton onUploadSuccess={() => { setPage(1); fetchTransactions() }} />
        </div>
      </div>

      <FilterBar
        search={search}
        category={category}
        categories={categoryOptions}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleFilterChange(setCategory)}
        onDateFromChange={handleFilterChange(setDateFrom)}
        onDateToChange={handleFilterChange(setDateTo)}
      />

      {error && (
        <p className="text-[13px] text-lumen-danger mb-4">{error}</p>
      )}

      <div className="bg-lumen-surface rounded-2xl border border-lumen-border overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-lumen-accent/30 border-t-lumen-accent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-[13px] text-lumen-muted">
            {hasActiveFilters
              ? 'No transactions match your filters'
              : 'No transactions yet - upload a CSV to get started'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-lumen-border bg-lumen-surface-2">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-lumen-muted uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-lumen-muted uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-lumen-muted uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-lumen-muted uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-lumen-muted uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  saving={savingId === tx.id}
                  onCategoryChange={handleCategoryChange}
                  onEdit={setEditingTx}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        count={count}
        onPageChange={setPage}
      />

      {editingTx && (
        <EditModal
          transaction={editingTx}
          onSave={handleEditSave}
          onClose={() => setEditingTx(null)}
        />
      )}

      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-lumen-surface border border-lumen-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-lumen-text mb-2">Delete all transactions?</h2>
            <p className="text-[13px] text-lumen-muted mb-5">
              This will permanently delete all {count} transactions and their categorizations. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                disabled={deletingAll}
                className="px-4 py-2 text-[13px] font-medium text-lumen-muted hover:text-lumen-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="px-4 py-2 text-[13px] font-medium text-white bg-lumen-danger rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deletingAll ? 'Deleting…' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
