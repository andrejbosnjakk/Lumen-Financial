'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'
import { clearAnalyticsCache } from '@/lib/analyticsCache'
import type { IngestResult } from '@/lib/types'

interface Props {
  onUploadSuccess: () => void
}

type Status = { type: 'success' | 'error'; message: string }

function uploadMessage(result: IngestResult) {
  const details = []
  if (result.duplicates > 0) details.push(`${result.duplicates} duplicates skipped`)
  if ((result.modelCategorized ?? 0) > 0) details.push(`${result.modelCategorized} categorized`)
  if ((result.recategorizedDuplicates ?? 0) > 0) {
    details.push(`${result.recategorizedDuplicates} duplicates recategorized`)
  }
  if ((result.removedExistingDuplicates ?? 0) > 0) {
    details.push(`${result.removedExistingDuplicates} old duplicates removed`)
  }

  return details.length
    ? `Imported ${result.imported} transactions (${details.join(', ')})`
    : `Imported ${result.imported} transactions`
}

export default function CsvUploadButton({ onUploadSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

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
          setStatus({ type: 'error', message: 'Invalid CSV - missing required Revolut columns.' })
          return
        }
        setUploading(true)
        try {
          const res = await fetch('/api/transactions/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, filename: file.name }),
          })
          const json = (await res.json()) as IngestResult & { error?: string }
          if (!res.ok) throw new Error(json.error ?? 'Upload failed')
          setStatus({
            type: 'success',
            message: uploadMessage(json),
          })
          clearAnalyticsCache()
          onUploadSuccess()
        } catch (err: unknown) {
          setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
        } finally {
          setUploading(false)
        }
      },
    })
  }, [onUploadSuccess])

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
    <div className="flex flex-col items-end gap-1.5">
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      <motion.button
        onClick={() => inputRef.current?.click()}
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium text-lumen-accent disabled:opacity-50 transition-colors"
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
        {uploading ? 'Uploading...' : dragOver ? 'Drop to upload' : 'Upload CSV'}
      </motion.button>
      {status && (
        <p className={`text-[11px] ${status.type === 'success' ? 'text-lumen-success' : 'text-lumen-danger'}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}
