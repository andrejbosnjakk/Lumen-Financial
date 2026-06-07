'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart2, CheckCircle2, Tags, Upload } from 'lucide-react'
import Papa from 'papaparse'
import { validateColumns, type RevolutRow } from '@/lib/ingester'

type Phase = 'idle' | 'dragging' | 'uploading' | 'done' | 'error'

function stageLabel(progress: number): string {
  if (progress < 15) return 'Uploading data…'
  if (progress < 88) return 'Categorizing transactions…'
  return 'Saving to database…'
}

export default function DashboardUploadZone() {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [phase, setPhase]     = useState<Phase>('idle')
  const [message, setMessage] = useState('')
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
          setMessage("This doesn't look like a Revolut CSV - check the column headers.")
          return
        }
        setPhase('uploading')
        startProgress()
        try {
          const res  = await fetch('/api/transactions/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, filename: file.name }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error ?? 'Upload failed')
          finishProgress()
          setPhase('done')
          setMessage(`Imported ${json.imported} transactions`)
          router.refresh()
        } catch (err: unknown) {
          finishProgress()
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
        clickable ? 'cursor-pointer hover:bg-lumen-fill' : ''
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

      {phase === 'uploading' && (
        <div className="space-y-5 w-full max-w-xs mx-auto">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-9 h-9 border-2 border-lumen-accent/25 border-t-lumen-accent rounded-full mx-auto"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-lumen-muted">{stageLabel(progress)}</p>
              <p className="text-xs tabular-nums text-lumen-muted">{Math.round(progress)}%</p>
            </div>
            <div className="h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-lumen-accent"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[11px] text-lumen-muted/60 text-center">Duplicates are skipped automatically</p>
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
            <p className="text-xs text-lumen-muted mt-1">Updating your dashboard...</p>
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
