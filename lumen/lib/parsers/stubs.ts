import type { NormalisedRow } from './types'

// Phase-2 banks — CSV parsing not yet implemented.
// These stubs exist so the picker can show these banks (PDF path works via LLM extraction).
// When a user selects one of these banks and uploads a CSV, they'll get a clear error.

export function parseAsn(_rows: Record<string, string>[]): NormalisedRow[] {
  throw new Error('ASN Bank CSV parsing is not yet supported. Please upload a PDF instead.')
}

export function parseSns(_rows: Record<string, string>[]): NormalisedRow[] {
  throw new Error('SNS Bank CSV parsing is not yet supported. Please upload a PDF instead.')
}

export function parseTriodos(_rows: Record<string, string>[]): NormalisedRow[] {
  throw new Error('Triodos CSV parsing is not yet supported. Please upload a PDF instead.')
}

export function parseBunq(_rows: Record<string, string>[]): NormalisedRow[] {
  throw new Error('bunq CSV parsing is not yet supported. Please upload a PDF instead.')
}

export function parseN26(_rows: Record<string, string>[]): NormalisedRow[] {
  throw new Error('N26 CSV parsing is not yet supported. Please upload a PDF instead.')
}
