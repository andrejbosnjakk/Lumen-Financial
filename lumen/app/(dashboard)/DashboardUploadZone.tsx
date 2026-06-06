'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart2, CheckCircle2, Tags, Upload } from 'lucide-react'
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
      className={`lumen-glass rounded-[30px] border-2 border-dashed p-14 text-center transition-colors select-none ${
        clickable ? 'cursor-pointer hover:bg-white/[0.075]' : ''
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

      {phase === 'uploading' && (
        <div className="space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-9 h-9 border-2 border-lumen-accent/25 border-t-lumen-accent rounded-full mx-auto"
          />
          <div>
            <p className="text-sm font-medium text-lumen-text">Parsing and categorizing…</p>
            <p className="text-xs text-lumen-muted mt-1">Duplicates are skipped automatically</p>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          <div className="w-11 h-11 rounded-full bg-lumen-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={22} className="text-lumen-success" />
          </div>
          <div>
            <p className="text-sm font-semibold text-lumen-success">{message}</p>
            <p className="text-xs text-lumen-muted mt-1">Updating your dashboard…</p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-lumen-danger">{message}</p>
          <p className="text-xs text-lumen-muted">Click to try again</p>
        </div>
      )}

      {(phase === 'idle' || phase === 'dragging') && (
        <div className="space-y-5">
          <div className="w-11 h-11 rounded-2xl bg-lumen-accent/10 flex items-center justify-center mx-auto">
            <Upload size={20} className={`transition-colors ${phase === 'dragging' ? 'text-lumen-accent scale-110' : 'text-lumen-accent'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-lumen-text">
              {phase === 'dragging' ? 'Drop to import' : 'Drop your Revolut CSV here'}
            </p>
            <p className="text-xs text-lumen-muted mt-1.5">
              or <span className="text-lumen-accent underline underline-offset-2">browse files</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-lumen-muted/60">
              <Tags size={12} />
              <span>Auto-categorized</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-lumen-muted/60">
              <BarChart2 size={12} />
              <span>Instant analytics</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
