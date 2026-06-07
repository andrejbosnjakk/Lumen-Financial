'use client'

import { forwardRef, useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { BANKS, getParser, detectBank } from '@/lib/parsers'
import type { BankId, NormalisedRow } from '@/lib/parsers'
import { clearAnalyticsCache } from '@/lib/analyticsCache'
import type { IngestResult } from '@/lib/types'
import BankSelector from './BankSelector'

interface Props {
  onUploadSuccess: () => void
}

export interface CsvUploadHandle {
  processFile: (file: File) => void
}

type Status = { type: 'success' | 'error'; message: string }

function uploadMessage(result: IngestResult) {
  const details = []
  if (result.duplicates > 0) details.push(`${result.duplicates} duplicates skipped`)
  if ((result.modelCategorized ?? 0) > 0) details.push(`${result.modelCategorized} categorized`)
  if ((result.recategorizedDuplicates ?? 0) > 0) details.push(`${result.recategorizedDuplicates} re-tagged`)
  if ((result.removedExistingDuplicates ?? 0) > 0) details.push(`${result.removedExistingDuplicates} old dupes removed`)
  return details.length
    ? `Imported ${result.imported} transactions (${details.join(', ')})`
    : `Imported ${result.imported} transactions`
}

function stageLabel(progress: number): string {
  if (progress < 15) return 'Uploading data…'
  if (progress < 88) return 'Categorizing transactions…'
  return 'Saving to database…'
}

const CsvUploadButton = forwardRef<CsvUploadHandle, Props>(function CsvUploadButton({ onUploadSuccess }, ref) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function startProgress() {
    setProgress(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 88) return p
        const inc = p < 30 ? 5 : p < 60 ? 2 : 0.6
        return Math.min(p + inc, 88)
      })
    }, 350)
  }

  function finishProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setProgress(100)
  }

  async function uploadNormalisedRows(rows: NormalisedRow[], filename: string, bank: BankId) {
    setUploading(true)
    startProgress()
    try {
      const res = await fetch('/api/transactions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, filename, source: bank }),
      })
      const json = (await res.json()) as IngestResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      finishProgress()
      setStatus({ type: 'success', message: uploadMessage(json) })
      clearAnalyticsCache()
      onUploadSuccess()
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  async function uploadPdf(file: File, bank: BankId) {
    setUploading(true)
    startProgress()
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank', bank)
      const res = await fetch('/api/transactions/ingest/pdf', { method: 'POST', body: formData })
      const json = (await res.json()) as IngestResult & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'PDF upload failed')
      finishProgress()
      setStatus({ type: 'success', message: uploadMessage(json) })
      clearAnalyticsCache()
      onUploadSuccess()
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'PDF upload failed' })
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  const processFile = useCallback(async (file: File, bankOverride?: BankId) => {
    setStatus(null)
    const bank = bankOverride ?? selectedBank
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const isCsv = file.name.toLowerCase().endsWith('.csv')

    if (!isPdf && !isCsv) {
      setStatus({ type: 'error', message: 'File must be a .csv or .pdf' })
      return
    }

    if (!bank) {
      // No bank selected yet — show picker, then come back
      setShowPicker(true)
      return
    }

    if (isPdf) {
      await uploadPdf(file, bank)
      return
    }

    // CSV path
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = (results.meta.fields ?? []) as string[]
        const delimiter = results.meta.delimiter ?? ','

        // Validate: detect actual bank and warn if it doesn't match selection
        const detected = detectBank(headers, delimiter)
        if (detected && detected !== bank) {
          const detectedLabel = BANKS.find(b => b.id === detected)?.label ?? detected
          const chosenLabel = BANKS.find(b => b.id === bank)?.label ?? bank
          setStatus({
            type: 'error',
            message: `This looks like a ${detectedLabel} file, but you selected ${chosenLabel}. Please re-select your bank.`,
          })
          setSelectedBank(null)
          setShowPicker(true)
          return
        }

        try {
          const parser = getParser(bank)
          const rows = parser(results.data)
          if (rows.length === 0) {
            setStatus({ type: 'error', message: 'No valid transactions found in this file.' })
            return
          }
          await uploadNormalisedRows(rows, file.name, bank)
        } catch (err: unknown) {
          setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to parse file.' })
        }
      },
      error: () => setStatus({ type: 'error', message: 'Failed to parse CSV.' }),
      delimiter: '',  // auto-detect
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBank, onUploadSuccess])

  useImperativeHandle(ref, () => ({ processFile }), [processFile])

  function handleBankSelect(bank: BankId) {
    setSelectedBank(bank)
    setShowPicker(false)
    // Open file input for the selected bank
    setTimeout(() => inputRef.current?.click(), 50)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    processFile(file)
  }

  function handleButtonClick() {
    if (uploading) return
    setStatus(null)
    setShowPicker(true)
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleFileChange} className="hidden" />

      <motion.button
        onClick={handleButtonClick}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        disabled={uploading}
        whileTap={{ scale: 0.97 }}
        animate={{
          background: dragOver
            ? 'rgb(var(--lumen-accent-rgb) / 0.2)'
            : uploading
            ? 'rgb(var(--lumen-accent-rgb) / 0.08)'
            : 'rgb(var(--lumen-accent-rgb) / 0.12)',
          borderColor: dragOver ? 'rgb(var(--lumen-accent-rgb))' : 'rgb(var(--lumen-accent-rgb) / 0.3)',
        }}
        transition={{ duration: 0.15 }}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[13px] font-medium text-lumen-accent transition-colors disabled:opacity-60 sm:w-auto"
      >
        {uploading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-3.5 h-3.5 border-2 border-lumen-accent/30 border-t-lumen-accent rounded-full"
          />
        ) : (
          <Upload size={14} />
        )}
        {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Import transactions'}
      </motion.button>

      {uploading && (
        <div className="w-full sm:w-44">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-lumen-muted">{stageLabel(progress)}</span>
            <span className="text-[10px] tabular-nums text-lumen-muted">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] w-full rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-lumen-accent"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {!uploading && status && (
        <p className={`max-w-full text-left text-[11px] sm:max-w-[320px] sm:text-right ${status.type === 'success' ? 'text-lumen-success' : 'text-lumen-danger'}`}>
          {status.message}
        </p>
      )}

      {/* Bank picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              className="lumen-panel w-full max-w-sm rounded-[24px] p-6 shadow-accent-glow max-h-[85vh] overflow-y-auto"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-lumen-accent">Import transactions</p>
                  <h2 className="text-base font-semibold text-lumen-text">Select your bank</h2>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-lumen-muted transition-colors hover:bg-lumen-fill hover:text-lumen-text"
                >
                  <X size={15} />
                </button>
              </div>
              <BankSelector banks={BANKS} onSelect={handleBankSelect} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default CsvUploadButton
