import type { NormalisedRow } from './types'

// Rabobank CSV: comma-delimited, 26 columns, ISO dates (YYYY-MM-DD), dot decimal, signed amounts
export function parse(rows: Record<string, string>[]): NormalisedRow[] {
  const out: NormalisedRow[] = []

  for (const row of rows) {
    const amount = parseFloat(row['Bedrag'] ?? '')
    if (isNaN(amount)) continue

    // Join up to 3 description fields
    const desc = [row['Omschrijving-1'], row['Omschrijving-2'], row['Omschrijving-3']]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' ')
      || row['Naam tegenpartij']?.trim()
      || ''

    const balance = parseFloat(row['Saldo na trn'] ?? '')

    out.push({
      date: (row['Datum'] ?? '').split('T')[0],
      description: desc,
      amount,
      currency: row['Munt'] ?? 'EUR',
      counterparty_name: row['Naam tegenpartij']?.trim() || undefined,
      counterparty_iban: row['Tegenpartij IBAN']?.trim() || undefined,
      reference: row['Betalingskenmerk']?.trim() || undefined,
      balance_after: isNaN(balance) ? undefined : balance,
    })
  }

  return out
}

export const REQUIRED_COLUMNS = ['Datum', 'Bedrag', 'Munt']
