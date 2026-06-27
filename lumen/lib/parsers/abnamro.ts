import type { NormalisedRow } from './types'

// ABN AMRO TXT: tab-delimited, NO headers, 8 positional columns, YYYYMMDD dates, comma decimal
// Column order: account | currency | txDate | balanceBefore | balanceAfter | valueDate | amount | description
function parseDate(raw: string): string {
  const s = raw.replace(/\D/g, '')
  if (s.length !== 8) return raw
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
}

export function parseRaw(lines: string[]): NormalisedRow[] {
  const out: NormalisedRow[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 8) continue

    const amount = parseAmount(cols[6] ?? '')
    if (isNaN(amount)) continue

    const balance = parseAmount(cols[4] ?? '')

    out.push({
      date: parseDate(cols[2] ?? ''),
      description: (cols[7] ?? '').trim(),
      amount,
      currency: (cols[1] ?? 'EUR').trim(),
      balance_after: isNaN(balance) ? undefined : balance,
    })
  }

  return out
}

// When PapaParse is used with tab delimiter it gives us keyed rows
// ABN AMRO has no headers so PapaParse assigns column indices as keys ("0","1",...)
export function parse(rows: Record<string, string>[]): NormalisedRow[] {
  const lines = rows.map((r) => Object.values(r).join('\t'))
  return parseRaw(lines)
}
