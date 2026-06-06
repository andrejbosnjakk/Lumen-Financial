'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'

type Phase = 'idle' | 'dragging' | 'uploading' | 'done' | 'error'

export default function DashboardUploadZone() {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [phase, setPhase]     = useState<Phase>('idle')
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
          setMessage("This doesn't look like a Revolut CSV — check the column headers.")
          return
        }
        setPhase('uploading')
        try {
          const res  = await fetch('/api/transactions/ingest', {
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
      error: () => { setPhase('error'); setMessage('Failed to parse CSV.') },
    })
  }, [router])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (phase === 'uploading') return
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

  const clickable = phase === 'idle' || phase === 'error'

  return (
    <motion.div
      onClick={() => clickable && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); if (phase !== 'uploading') setPhase('dragging') }}
      onDragLeave={() => { if (phase === 'dragging') setPhase('idle') }}
      animate={{
        borderColor: phase === 'dragging' ? 'rgb(var(--lumen-accent-rgb))'
          : phase === 'error'   ? '#EF4444'
          : phase === 'done'    ? '#10B981'
          : '#252836',
      }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border-2 border-dashed p-14 text-center transition-colors bg-lumen-surface select-none ${
        clickable ? 'cursor-pointer hover:bg-lumen-surface-2' : ''
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

      {phase === 'uploading' && (
        <div className="space-y-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-lumen-accent/30 border-t-lumen-accent rounded-full mx-auto"
          />
          <p className="text-[13px] text-lumen-muted">Importing transactions…</p>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-full bg-lumen-success/10 flex items-center justify-center mx-auto">
            <span className="text-lumen-success text-lg">✓</span>
          </div>
          <p className="text-[13px] font-medium text-lumen-success">{message}</p>
          <p className="text-[12px] text-lumen-muted">Refreshing your dashboard…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-lumen-danger">{message}</p>
          <p className="text-[12px] text-lumen-muted">Click to try again</p>
        </div>
      )}

      {(phase === 'idle' || phase === 'dragging') && (
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-lumen-accent/10 flex items-center justify-center mx-auto">
            <Upload size={18} className="text-lumen-accent" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-lumen-text">
              {phase === 'dragging' ? 'Drop your CSV here' : 'Drop your Revolut CSV here'}
            </p>
            <p className="text-[12px] text-lumen-muted mt-1">
              or <span className="text-lumen-accent underline underline-offset-2">browse files</span>
            </p>
          </div>
          <p className="text-[11px] text-lumen-muted/60 uppercase tracking-wider">
            Revolut account statement · CSV
          </p>
        </div>
      )}
    </motion.div>
  )
}
