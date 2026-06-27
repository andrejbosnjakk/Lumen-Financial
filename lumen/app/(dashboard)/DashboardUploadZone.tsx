'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, CheckCircle2, Tags, Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { BANKS, getParser, detectBank } from '@/lib/parsers'
import type { BankId, NormalisedRow } from '@/lib/parsers'
import BankSelector from './transactions/BankSelector'

type Phase = 'idle' | 'dragging' | 'bank_select' | 'uploading' | 'done' | 'error'

function stageLabel(progress: number): string {
  if (progress < 15) return 'Uploading data…'
  if (progress < 88) return 'Categorizing transactions…'
  return 'Saving to database…'
}

export default function DashboardUploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
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

  async function uploadRows(rows: NormalisedRow[], filename: string, bank: BankId) {
    setPhase('uploading')
    startProgress()
    try {
      const res = await fetch('/api/transactions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, filename, source: bank }),
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
  }

  async function uploadPdf(file: File, bank: BankId) {
    setPhase('uploading')
    startProgress()
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank', bank)
      const res = await fetch('/api/transactions/ingest/pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'PDF upload failed')
      finishProgress()
      setPhase('done')
      setMessage(`Imported ${json.imported} transactions`)
      router.refresh()
    } catch (err: unknown) {
      finishProgress()
      setPhase('error')
      setMessage(err instanceof Error ? err.message : 'PDF upload failed')
    }
  }

  const handleBankSelect = useCallback(async (bank: BankId) => {
    const file = pendingFile
    if (!file) {
      // No pending file — open file picker now that bank is chosen
      setPhase('idle')
      setPendingFile(null)
      setTimeout(() => inputRef.current?.click(), 50)
      return
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      await uploadPdf(file, bank)
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      complete: async (results) => {
        const headers = (results.meta.fields ?? []) as string[]
        const delimiter = results.meta.delimiter ?? ','
        const detected = detectBank(headers, delimiter)
        if (detected && detected !== bank) {
          const detectedLabel = BANKS.find(b => b.id === detected)?.label ?? detected
          const chosenLabel = BANKS.find(b => b.id === bank)?.label ?? bank
          setPhase('error')
          setMessage(`This looks like a ${detectedLabel} file, but you selected ${chosenLabel}.`)
          return
        }
        try {
          const parser = getParser(bank)
          const rows = parser(results.data)
          await uploadRows(rows, file.name, bank)
        } catch (err: unknown) {
          setPhase('error')
          setMessage(err instanceof Error ? err.message : 'Failed to parse file.')
        }
      },
      error: () => { setPhase('error'); setMessage('Failed to parse file.') },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile, router])

  const triggerBankSelect = useCallback((file?: File) => {
    setPendingFile(file ?? null)
    setPhase('bank_select')
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (phase === 'uploading') return
    const file = e.dataTransfer.files[0]
    if (!file) return
    triggerBankSelect(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    triggerBankSelect(file)
  }

  const clickable = phase === 'idle' || phase === 'error'

  return (
    <>
      <motion.div
        onClick={() => clickable && triggerBankSelect()}
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
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleFileChange} className="hidden" />

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
                {phase === 'dragging' ? 'Drop to import' : 'Import bank transactions'}
              </p>
              <p className="text-xs text-lumen-muted mt-1.5">
                CSV or PDF · <span className="text-lumen-accent underline underline-offset-2">browse files</span>
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

      {/* Bank picker — portal to document.body to escape transform stacking contexts */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {phase === 'bank_select' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.18 }}
                className="lumen-panel w-full max-w-sm rounded-[24px] p-6 shadow-accent-glow max-h-[80vh] overflow-y-auto"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-lumen-accent">Import transactions</p>
                    <h2 className="text-base font-semibold text-lumen-text">Select your bank</h2>
                  </div>
                  <button
                    onClick={() => setPhase('idle')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-lumen-muted transition-colors hover:bg-lumen-fill hover:text-lumen-text"
                  >
                    <X size={15} />
                  </button>
                </div>
                <BankSelector banks={BANKS} onSelect={handleBankSelect} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
