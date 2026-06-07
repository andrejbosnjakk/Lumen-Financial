'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import Papa from 'papaparse'
import { BANKS, getParser, detectBank } from '@/lib/parsers'
import type { BankId, NormalisedRow } from '@/lib/parsers'
import type { IngestResult } from '@/lib/types'
import BankSelector from './BankSelector'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

type ModalState =
  | { status: 'bank_select' }
  | { status: 'idle'; bank: BankId }
  | { status: 'ready'; bank: BankId; file: File; rows: NormalisedRow[] }
  | { status: 'uploading' }
  | { status: 'done'; result: IngestResult }
  | { status: 'error'; message: string; bank?: BankId }

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [state, setState] = useState<ModalState>({ status: 'bank_select' })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleBankSelect(bank: BankId) {
    setState({ status: 'idle', bank })
  }

  function handleFile(file: File, bank: BankId) {
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const isCsv = file.name.toLowerCase().endsWith('.csv')

    if (!isPdf && !isCsv) {
      setState({ status: 'error', message: 'File must be a .csv or .pdf', bank })
      return
    }

    if (isPdf) {
      // PDF: store file directly, no client-side parsing
      setState({ status: 'ready', bank, file, rows: [] })
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      complete(results) {
        const headers = (results.meta.fields ?? []) as string[]
        const delimiter = results.meta.delimiter ?? ','
        const detected = detectBank(headers, delimiter)

        if (detected && detected !== bank) {
          const detectedLabel = BANKS.find(b => b.id === detected)?.label ?? detected
          const chosenLabel = BANKS.find(b => b.id === bank)?.label ?? bank
          setState({
            status: 'error',
            message: `This looks like a ${detectedLabel} file, but you selected ${chosenLabel}. Please go back and select the correct bank.`,
          })
          return
        }

        try {
          const parser = getParser(bank)
          const rows = parser(results.data)
          if (rows.length === 0) {
            setState({ status: 'error', message: 'No valid transactions found in this file.', bank })
            return
          }
          setState({ status: 'ready', bank, file, rows })
        } catch (err: unknown) {
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to parse file.', bank })
        }
      },
      error() {
        setState({ status: 'error', message: 'Failed to parse CSV.', bank })
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const bank = state.status === 'idle' || state.status === 'ready' ? state.bank
      : state.status === 'error' && state.bank ? state.bank
      : null
    if (bank) handleFile(file, bank)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const bank = state.status === 'idle' || state.status === 'ready' ? state.bank
      : state.status === 'error' && state.bank ? state.bank
      : null
    if (bank) handleFile(file, bank)
  }

  async function handleUpload() {
    if (state.status !== 'ready') return
    const { bank, file, rows } = state
    setState({ status: 'uploading' })

    const isPdf = file.name.toLowerCase().endsWith('.pdf')

    try {
      let res: Response
      if (isPdf) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bank', bank)
        res = await fetch('/api/transactions/ingest/pdf', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/transactions/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows, filename: file.name, source: bank }),
        })
      }

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

  const currentBank = state.status === 'idle' || state.status === 'ready'
    ? state.bank
    : state.status === 'error' && state.bank
    ? state.bank
    : null

  const bankLabel = currentBank ? BANKS.find(b => b.id === currentBank)?.label ?? currentBank : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="lumen-panel w-full max-w-md rounded-[24px] p-6 shadow-accent-glow">
        <div className="mb-5 flex items-center justify-between">
          <div>
            {state.status !== 'bank_select' && (
              <p className="text-[11px] font-medium text-lumen-accent">{bankLabel}</p>
            )}
            <h2 className="text-base font-semibold text-lumen-text">
              {state.status === 'bank_select' ? 'Select your bank' : 'Import transactions'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-lumen-muted transition-colors hover:bg-lumen-fill hover:text-lumen-text"
          >
            <X size={15} />
          </button>
        </div>

        {state.status === 'bank_select' && (
          <BankSelector banks={BANKS} onSelect={handleBankSelect} />
        )}

        {state.status === 'done' && (
          <div className="space-y-4">
            <div className="space-y-1 rounded-2xl border border-lumen-border bg-lumen-fill p-4">
              <p className="text-sm text-lumen-text">
                <span className="font-medium">{state.result.imported}</span> transactions imported
              </p>
              {state.result.duplicates > 0 && (
                <p className="text-sm text-lumen-muted">{state.result.duplicates} duplicates skipped</p>
              )}
              {(state.result.modelCategorized ?? 0) > 0 && (
                <p className="text-sm text-lumen-muted">{state.result.modelCategorized} categorized by model</p>
              )}
              {(state.result.recategorizedDuplicates ?? 0) > 0 && (
                <p className="text-sm text-lumen-muted">{state.result.recategorizedDuplicates} duplicate categories updated</p>
              )}
              {(state.result.removedExistingDuplicates ?? 0) > 0 && (
                <p className="text-sm text-lumen-muted">{state.result.removedExistingDuplicates} old duplicates removed</p>
              )}
              {state.result.failed > 0 && (
                <p className="text-sm text-lumen-danger">{state.result.failed} rows failed</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center rounded-2xl bg-lumen-accent text-sm font-semibold text-white transition-colors hover:bg-lumen-accent-dim"
            >
              Done
            </button>
          </div>
        )}

        {(state.status === 'idle' || state.status === 'ready' || state.status === 'error') && currentBank && (
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
                accept=".csv,.pdf"
                className="hidden"
                onChange={handleInputChange}
              />

              {state.status === 'ready' ? (
                <div>
                  <p className="text-sm font-medium text-lumen-text">{state.file.name}</p>
                  <p className="mt-1 text-xs text-lumen-muted">
                    {state.file.name.toLowerCase().endsWith('.pdf')
                      ? `${(state.file.size / 1024).toFixed(1)} KB — will extract with AI`
                      : `${state.rows.length} transactions · ${(state.file.size / 1024).toFixed(1)} KB`}
                  </p>
                  <p className="mt-2 text-xs text-lumen-muted">Click to choose a different file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-lumen-muted">
                    Drag and drop your file here, or{' '}
                    <span className="font-medium text-lumen-text">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-lumen-muted">{bankLabel} — CSV or PDF accepted</p>
                </div>
              )}
            </div>

            {state.status === 'error' && (
              <p className="text-sm text-lumen-danger">{state.message}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setState({ status: 'bank_select' })}
                className="flex h-11 w-auto items-center justify-center rounded-2xl border border-lumen-border px-4 text-sm font-medium text-lumen-muted transition-colors hover:text-lumen-text"
              >
                Change bank
              </button>
              <button
                onClick={handleUpload}
                disabled={state.status !== 'ready'}
                className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-lumen-accent text-sm font-semibold text-white transition-colors hover:bg-lumen-accent-dim disabled:cursor-not-allowed disabled:opacity-45"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {state.status === 'uploading' && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-lumen-accent/30 border-t-lumen-accent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
