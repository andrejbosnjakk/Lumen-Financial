import type { NormalisedRow } from './types'

// ING CSV: comma-delimited, 9 columns, YYYYMMDD dates, comma decimal, always-positive amount
// "Af Bij" column: "Af" = debit, "Bij" = credit
function parseIngDate(raw: string): string {
  // YYYYMMDD → YYYY-MM-DD
  const s = raw.replace(/\D/g, '')
  if (s.length !== 8) return raw
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
}

export function parse(rows: Record<string, string>[]): NormalisedRow[] {
  const out: NormalisedRow[] = []

  for (const row of rows) {
    const rawAmount = row['Bedrag (EUR)'] ?? row['Bedrag'] ?? ''
    const amount = parseAmount(rawAmount)
    if (isNaN(amount)) continue

    const direction = (row['Af Bij'] ?? '').trim()
    const signedAmount = direction === 'Af' ? -Math.abs(amount) : Math.abs(amount)

    const description = (row['Mededelingen'] || row['Naam / Omschrijving'] || '').trim()

    out.push({
      date: parseIngDate(row['Datum'] ?? ''),
      description,
      amount: signedAmount,
      currency: 'EUR',
      type: row['MutatieSoort'] ?? row['Code'],
      counterparty_name: row['Naam / Omschrijving']?.trim(),
      counterparty_iban: row['Tegenrekening']?.trim() || undefined,
    })
  }

  return out
}

export const REQUIRED_COLUMNS = ['Datum', 'Naam / Omschrijving', 'Bedrag (EUR)', 'Af Bij']
