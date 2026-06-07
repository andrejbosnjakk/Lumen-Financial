'use client'

import { forwardRef, useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'
import { clearAnalyticsCache } from '@/lib/analyticsCache'
import type { IngestResult } from '@/lib/types'

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

  const processFile = useCallback(async (file: File) => {
    setStatus(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus({ type: 'error', message: 'File must be a .csv' })
      return
    }
    Papa.parse<RevolutRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = (results.meta.fields ?? []) as string[]
        if (!validateColumns(headers)) {
          setStatus({ type: 'error', message: 'Invalid CSV — missing required Revolut columns.' })
          return
        }
        setUploading(true)
        startProgress()
        try {
          const res = await fetch('/api/transactions/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, filename: file.name }),
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
      },
      error: () => setStatus({ type: 'error', message: 'Failed to parse CSV.' }),
    })
  }, [onUploadSuccess])

  useImperativeHandle(ref, () => ({ processFile }), [processFile])

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

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      <motion.button
        onClick={() => !uploading && inputRef.current?.click()}
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
        {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Upload CSV'}
      </motion.button>

      {/* Progress bar — visible while uploading */}
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
    </div>
  )
})

export default CsvUploadButton
