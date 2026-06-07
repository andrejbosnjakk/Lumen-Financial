export type BankId =
  | 'revolut'
  | 'ing'
  | 'rabobank'
  | 'abnamro'
  | 'knab'
  | 'asn'
  | 'sns'
  | 'triodos'
  | 'bunq'
  | 'n26'

export interface NormalisedRow {
  date: string               // YYYY-MM-DD
  description: string
  amount: number             // signed float, negative = debit
  currency: string           // ISO 4217
  type?: string
  counterparty_name?: string
  counterparty_iban?: string
  reference?: string
  balance_after?: number
}

export interface BankMeta {
  id: BankId
  label: string
  acceptedFormats: string[]  // e.g. ['.csv'] or ['.csv', '.pdf']
}

export const BANKS: BankMeta[] = [
  { id: 'revolut',  label: 'Revolut',   acceptedFormats: ['.csv', '.pdf'] },
  { id: 'ing',      label: 'ING',       acceptedFormats: ['.csv', '.pdf'] },
  { id: 'rabobank', label: 'Rabobank',  acceptedFormats: ['.csv', '.pdf'] },
  { id: 'abnamro',  label: 'ABN AMRO',  acceptedFormats: ['.csv', '.pdf'] },
  { id: 'knab',     label: 'Knab',      acceptedFormats: ['.csv', '.pdf'] },
  { id: 'asn',      label: 'ASN Bank',  acceptedFormats: ['.pdf'] },
  { id: 'sns',      label: 'SNS Bank',  acceptedFormats: ['.pdf'] },
  { id: 'triodos',  label: 'Triodos',   acceptedFormats: ['.pdf'] },
  { id: 'bunq',     label: 'bunq',      acceptedFormats: ['.csv', '.pdf'] },
  { id: 'n26',      label: 'N26',       acceptedFormats: ['.csv', '.pdf'] },
]
