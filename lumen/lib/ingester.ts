import type { Transaction } from './types'

export type RevolutRow = {
  Type: string
  Product: string
  'Started Date': string
  'Completed Date': string
  Description: string
  Amount: string
  Fee: string
  Currency: string
  State: string
  Balance: string
}

export const REQUIRED_COLUMNS: (keyof RevolutRow)[] = [
  'Type',
  'Started Date',
  'Completed Date',
  'Description',
  'Amount',
  'Fee',
  'Currency',
  'State',
  'Balance',
]

export function validateColumns(headers: string[]): boolean {
  return REQUIRED_COLUMNS.every((col) => headers.includes(col))
}

export function parseRow(
  row: RevolutRow,
  userId: string,
  batchId: string,
  category: string
): Omit<Transaction, 'id' | 'created_at'> | null {
  if (row.State !== 'COMPLETED') return null

  const amount = parseFloat(row.Amount)
  const fee = parseFloat(row.Fee) || 0
  const balance = parseFloat(row.Balance)

  if (isNaN(amount)) return null

  return {
    user_id: userId,
    source: 'Revolut',
    type: row.Type,
    product: row.Product || null,
    started_date: row['Started Date'],
    completed_date: row['Completed Date'],
    description: row.Description,
    amount,
    fee,
    currency: row.Currency,
    state: row.State,
    balance_after_transaction: isNaN(balance) ? null : balance,
    category,
    is_recurring: false,
    import_batch_id: batchId,
  }
}
