import type { BankId } from './types'

export function detectBank(headers: string[], delimiter: string): BankId | null {
  if (delimiter === '\t') return 'abnamro'
  if (delimiter === ';') return 'triodos'

  const h = new Set(headers)

  if (h.has('Started Date') && h.has('Completed Date') && h.has('State')) return 'revolut'
  if (h.has('Af Bij') || h.has('MutatieSoort') || h.has('Mededelingen')) return 'ing'
  if (h.has('Volgnr') || h.has('Rentedatum') || h.has('Tegenpartij IBAN')) return 'rabobank'
  if (h.has('CreditDebet') && h.has('Tegenrekeninghouder')) return 'knab'
  if (h.has('Partner Name') && h.has('Booking Date') && h.has('Amount (EUR)')) return 'n26'

  return null
}
