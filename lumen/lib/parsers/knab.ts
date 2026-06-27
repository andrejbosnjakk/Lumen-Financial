import type { NormalisedRow } from './types'

// Knab CSV: comma-delimited, 16 columns, DD-MM-YYYY dates, comma decimal
// CreditDebet: "C" = credit, "D" = debit (negate amount)
function parseDate(raw: string): string {
  // DD-MM-YYYY → YYYY-MM-DD
  const parts = raw.split('-')
  if (parts.length !== 3) return raw
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
}

export function parse(rows: Record<string, string>[]): NormalisedRow[] {
  const out: NormalisedRow[] = []

  for (const row of rows) {
    const rawAmount = row['Bedrag'] ?? ''
    const amount = parseAmount(rawAmount)
    if (isNaN(amount)) continue

    const direction = (row['CreditDebet'] ?? '').trim().toUpperCase()
    const signedAmount = direction === 'D' ? -Math.abs(amount) : Math.abs(amount)

    const date = parseDate(row['Boekdatum'] || row['Transactiedatum'] || '')

    out.push({
      date,
      description: (row['Omschrijving'] ?? '').trim(),
      amount: signedAmount,
      currency: (row['Valutacode'] ?? 'EUR').trim(),
      type: row['Type betaling']?.trim() || row['Betaalwijze']?.trim(),
      counterparty_name: row['Tegenrekeninghouder']?.trim() || undefined,
      counterparty_iban: row['Tegenrekeningnummer']?.trim() || undefined,
      reference: row['Referentie']?.trim() || undefined,
    })
  }

  return out
}

export const REQUIRED_COLUMNS = ['Boekdatum', 'Bedrag', 'CreditDebet', 'Omschrijving']
