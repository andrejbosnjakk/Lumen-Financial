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
            message: "This doesn't look like a Revolut CSV. Expected columns: Type, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance.",
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
      setState({ status: 'error', message: 'Network error - please try again.' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="lumen-panel w-full max-w-md rounded-[24px] p-6 shadow-accent-glow">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-lumen-text">Upload Revolut CSV</h2>
          <button
            onClick={onClose}
            aria-label="Close upload modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-lumen-muted transition-colors hover:bg-lumen-fill hover:text-lumen-text"
          >
            x
          </button>
        </div>

        {state.status === 'done' ? (
          <div className="space-y-4">
            <div className="space-y-1 rounded-2xl border border-lumen-border bg-lumen-fill p-4">
              <p className="text-sm text-lumen-text">
                <span className="font-medium">{state.result.imported}</span> transactions imported
              </p>
              {state.result.duplicates > 0 && (
                <p className="text-sm text-lumen-muted">
                  {state.result.duplicates} duplicates skipped
                </p>
              )}
              {state.result.failed > 0 && (
                <p className="text-sm text-lumen-danger">
                  {state.result.failed} rows failed
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-lumen-accent text-sm font-semibold text-white transition-colors hover:bg-lumen-accent-dim"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`relative cursor-pointer rounded-2xl border border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-lumen-accent/50 bg-lumen-accent/10'
                  : 'border-lumen-border bg-lumen-fill-sm hover:border-lumen-accent/40 hover:bg-lumen-fill'
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
                  <p className="text-sm font-medium text-lumen-text">{state.file.name}</p>
                  <p className="mt-1 text-xs text-lumen-muted">
                    {state.rows.length} rows - {(state.file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="mt-2 text-xs text-lumen-muted">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-lumen-muted">
                    Drag and drop your CSV here, or{' '}
                    <span className="font-medium text-lumen-text">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-lumen-muted">Revolut account statement CSV only</p>
                </div>
              )}
            </div>

            {state.status === 'error' && (
              <p className="text-sm text-lumen-danger">{state.message}</p>
            )}

            <button
              onClick={handleUpload}
              disabled={state.status !== 'ready'}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-lumen-accent text-sm font-semibold text-white transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-45"
            >
              {state.status === 'uploading' ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
