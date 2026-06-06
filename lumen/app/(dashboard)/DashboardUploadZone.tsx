'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'

type Phase = 'idle' | 'dragging' | 'uploading' | 'done' | 'error'

export default function DashboardUploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPhase('error')
      setMessage('File must be a .csv')
      return
    }
    Papa.parse<RevolutRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = (results.meta.fields ?? []) as string[]
        if (!validateColumns(headers)) {
          setPhase('error')
          setMessage("This doesn't look like a Revolut CSV. Check that it has the required columns.")
          return
        }
        setPhase('uploading')
        try {
          const res = await fetch('/api/transactions/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, filename: file.name }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error ?? 'Upload failed')
          setPhase('done')
          setMessage(`Imported ${json.imported} transactions`)
          router.refresh()
        } catch (err: unknown) {
          setPhase('error')
          setMessage(err instanceof Error ? err.message : 'Upload failed')
        }
      },
      error: () => {
        setPhase('error')
        setMessage('Failed to parse CSV.')
      },
    })
  }, [router])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setPhase('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    processFile(file)
  }

  const isActive = phase === 'uploading' || phase === 'done'

  return (
    <div
      onClick={() => phase === 'idle' || phase === 'error' ? inputRef.current?.click() : undefined}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); if (phase !== 'uploading') setPhase('dragging') }}
      onDragLeave={() => { if (phase === 'dragging') setPhase('idle') }}
      className={`rounded-xl border-2 border-dashed p-12 text-center transition-all select-none ${
        isActive
          ? 'border-gray-200 cursor-default'
          : phase === 'dragging'
          ? 'border-gray-400 bg-gray-50 cursor-copy'
          : phase === 'error'
          ? 'border-red-200 bg-red-50 cursor-pointer hover:border-red-300'
          : 'border-gray-200 cursor-pointer hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

      {phase === 'uploading' && (
        <>
          <p className="text-sm font-medium text-gray-900 mb-1">Uploading…</p>
          <p className="text-xs text-gray-400">Please wait</p>
        </>
      )}

      {phase === 'done' && (
        <>
          <p className="text-sm font-medium text-emerald-600 mb-1">{message}</p>
          <p className="text-xs text-gray-400">Refreshing dashboard…</p>
        </>
      )}

      {phase === 'error' && (
        <>
          <p className="text-sm font-medium text-red-600 mb-1">{message}</p>
          <p className="text-xs text-gray-400">Click to try again</p>
        </>
      )}

      {(phase === 'idle' || phase === 'dragging') && (
        <>
          <p className="text-sm text-gray-500 mb-1">
            {phase === 'dragging' ? 'Drop your CSV here' : 'Drag and drop your Revolut CSV here'}
          </p>
          <p className="text-xs text-gray-400">
            or <span className="text-gray-900 font-medium underline underline-offset-2">browse files</span>
          </p>
        </>
      )}
    </div>
  )
}
