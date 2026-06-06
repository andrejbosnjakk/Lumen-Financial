'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'
import type { IngestResult } from '@/lib/types'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

type ModalState =
  | { status: 'idle' }
  | { status: 'ready'; file: File; rows: RevolutRow[] }
  | { status: 'uploading' }
  | { status: 'done'; result: IngestResult }
  | { status: 'error'; message: string }

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [state, setState] = useState<ModalState>({ status: 'idle' })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setState({ status: 'error', message: 'File must be a .csv' })
      return
    }

    Papa.parse<RevolutRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? []
        if (!validateColumns(headers)) {
          setState({
            status: 'error',
            message: 'This doesn\'t look like a Revolut CSV. Expected columns: Type, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance.',
          })
          return
        }
        setState({ status: 'ready', file, rows: results.data })
      },
      error() {
        setState({ status: 'error', message: 'Failed to parse CSV.' })
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  async function handleUpload() {
    if (state.status !== 'ready') return
    setState({ status: 'uploading' })

    try {
      const res = await fetch('/api/transactions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: state.rows, filename: state.file.name }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        setState({ status: 'error', message: error ?? 'Upload failed.' })
        return
      }

      const result: IngestResult = await res.json()
      setState({ status: 'done', result })
      onSuccess()
    } catch {
      setState({ status: 'error', message: 'Network error — please try again.' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Upload Revolut CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {state.status === 'done' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{state.result.imported}</span> transactions imported
              </p>
              {state.result.duplicates > 0 && (
                <p className="text-sm text-gray-500">
                  {state.result.duplicates} duplicates skipped
                </p>
              )}
              {state.result.failed > 0 && (
                <p className="text-sm text-red-500">
                  {state.result.failed} rows failed
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
              />

              {state.status === 'ready' ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{state.file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {state.rows.length} rows · {(state.file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">
                    Drag and drop your CSV here, or{' '}
                    <span className="text-gray-900 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Revolut account statement CSV only</p>
                </div>
              )}
            </div>

            {state.status === 'error' && (
              <p className="text-sm text-red-600">{state.message}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={state.status !== 'ready'}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state.status === 'uploading' ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
