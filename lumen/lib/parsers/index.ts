export { detectBank } from './detect'
export { BANKS } from './types'
export type { BankId, NormalisedRow, BankMeta } from './types'

import { parse as parseRevolut } from './revolut'
import { parse as parseIng } from './ing'
import { parse as parseRabobank } from './rabobank'
import { parse as parseAbnamro } from './abnamro'
import { parse as parseKnab } from './knab'
import { parseAsn, parseSns, parseTriodos, parseBunq, parseN26 } from './stubs'
import type { BankId, NormalisedRow } from './types'

const PARSERS: Record<BankId, (rows: Record<string, string>[]) => NormalisedRow[]> = {
  revolut:  parseRevolut,
  ing:      parseIng,
  rabobank: parseRabobank,
  abnamro:  parseAbnamro,
  knab:     parseKnab,
  asn:      parseAsn,
  sns:      parseSns,
  triodos:  parseTriodos,
  bunq:     parseBunq,
  n26:      parseN26,
}

export function getParser(bankId: BankId): (rows: Record<string, string>[]) => NormalisedRow[] {
  return PARSERS[bankId]
}
