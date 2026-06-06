'use client'

import { useRef, useState, useCallback } from 'react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'

interface Props {
  onUploadSuccess: () => void
}

type Status = { type: 'success' | 'error'; message: string }

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
          setStatus({ type: 'error', message: 'Invalid CSV — missing required Revolut columns.' })
          return
        }
        setUploading(true)
        try {
          const res = await fetch('/api/transactions/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, filename: file.name }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error ?? 'Upload failed')
          setStatus({
            type: 'success',
            message: `Imported ${json.imported} transactions (${json.duplicates} duplicates skipped)`,
          })
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
      <button
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        disabled={uploading}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
          dragOver
            ? 'bg-gray-700 text-white ring-2 ring-gray-400 ring-offset-1'
            : 'bg-gray-900 text-white hover:bg-gray-700'
        }`}
      >
        {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : '↑ Upload CSV'}
      </button>
      {status && (
        <p className={`text-xs ${status.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}
