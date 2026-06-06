'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'

interface Props {
  onUploadSuccess: () => void
}

type Status = { type: 'success' | 'error'; message: string }

export default function CsvUploadButton({ onUploadSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setStatus(null)

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
          setStatus({
            type: 'error',
            message: err instanceof Error ? err.message : 'Upload failed',
          })
        } finally {
          setUploading(false)
        }
      },
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? 'Uploading…' : '↑ Upload CSV'}
      </button>
      {status && (
        <p className={`text-xs ${status.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}
