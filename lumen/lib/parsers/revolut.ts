import type { NormalisedRow } from './types'

// Revolut CSV: comma-delimited, headers present, date "YYYY-MM-DD HH:MM:SS"
// Amount is signed, State must be COMPLETED
export function parse(rows: Record<string, string>[]): NormalisedRow[] {
  const out: NormalisedRow[] = []

  for (const row of rows) {
    if (row['State'] !== 'COMPLETED') continue

    const amount = parseFloat(row['Amount'] ?? '')
    if (isNaN(amount)) continue

    const rawDate = row['Completed Date'] || row['Started Date'] || ''
    const date = rawDate.split(' ')[0].split('T')[0]

    out.push({
      date,
      description: row['Description']?.trim() ?? '',
      amount,
      currency: row['Currency'] ?? 'EUR',
      type: row['Type'],
      balance_after: parseFloat(row['Balance'] ?? '') || undefined,
    })
  }

  return out
}

export const REQUIRED_COLUMNS = [
  'Type', 'Started Date', 'Completed Date',
  'Description', 'Amount', 'Fee', 'Currency', 'State', 'Balance',
]

export function validateColumns(headers: string[]): boolean {
  return REQUIRED_COLUMNS.every((c) => headers.includes(c))
}
