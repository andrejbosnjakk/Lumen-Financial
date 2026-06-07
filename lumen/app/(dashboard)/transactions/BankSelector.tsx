'use client'

import type { BankId, BankMeta } from '@/lib/parsers'

interface Props {
  banks: BankMeta[]
  acceptPdf?: boolean
  onSelect: (bank: BankId) => void
  onCancel?: () => void
}

// Simple coloured initials badge — replace src with real logos if available
function BankBadge({ id, label }: { id: BankId; label: string }) {
  const colours: Record<BankId, string> = {
    revolut:  'bg-[#191C1F] text-white',
    ing:      'bg-[#FF6200] text-white',
    rabobank: 'bg-[#003882] text-white',
    abnamro:  'bg-[#009286] text-white',
    knab:     'bg-[#00A3E0] text-white',
    asn:      'bg-[#00843D] text-white',
    sns:      'bg-[#E4002B] text-white',
    triodos:  'bg-[#005E3F] text-white',
    bunq:     'bg-[#00D4B4] text-black',
    n26:      'bg-[#333] text-white',
  }

  const initials = label.replace('Bank', '').replace('Netherlands', '').trim().slice(0, 3).toUpperCase()

  return (
    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${colours[id] ?? 'bg-lumen-fill text-lumen-text'}`}>
      {initials}
    </div>
  )
}

export default function BankSelector({ banks, acceptPdf = true, onSelect, onCancel }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
        {banks.map((bank) => {
          const csvOnly = !bank.acceptedFormats.includes('.pdf')
          const pdfOnly = !bank.acceptedFormats.includes('.csv')
          const badge = csvOnly ? 'CSV' : pdfOnly ? 'PDF' : null

          return (
            <button
              key={bank.id}
              onClick={() => onSelect(bank.id)}
              className="flex items-center gap-3 rounded-xl border border-lumen-border bg-lumen-fill px-3 py-2.5 text-left transition-colors hover:border-lumen-accent/40 hover:bg-lumen-surface-2"
            >
              <BankBadge id={bank.id} label={bank.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-lumen-text">{bank.label}</p>
                {badge && (
                  <p className="text-[10px] text-lumen-muted">{badge} only</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {!acceptPdf && (
        <p className="text-center text-[11px] text-lumen-muted">
          PDF import also available after selecting your bank
        </p>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full text-center text-[12px] text-lumen-muted hover:text-lumen-text transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
