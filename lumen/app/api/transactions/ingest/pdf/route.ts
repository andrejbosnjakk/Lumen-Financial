import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
// pdf-parse is a CJS module without a proper ESM default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
import type { BankId, NormalisedRow } from '@/lib/parsers'

const anthropic = new Anthropic()

async function extractTransactionsFromPdf(
  buffer: Buffer,
  bank: BankId
): Promise<NormalisedRow[]> {
  const data = await pdfParse(buffer)
  const text = data.text

  if (!text.trim()) {
    throw new Error('Could not extract text from this PDF. It may be a scanned image.')
  }

  const bankLabels: Record<BankId, string> = {
    revolut: 'Revolut',
    ing: 'ING Netherlands',
    rabobank: 'Rabobank Netherlands',
    abnamro: 'ABN AMRO Netherlands',
    knab: 'Knab Netherlands',
    asn: 'ASN Bank Netherlands',
    sns: 'SNS Bank Netherlands',
    triodos: 'Triodos Bank Netherlands',
    bunq: 'bunq',
    n26: 'N26',
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a financial data extraction expert. Extract all bank transactions from the following ${bankLabels[bank]} bank statement text.

Return ONLY a valid JSON array with no other text. Each element must have:
- "date": transaction date in YYYY-MM-DD format
- "description": merchant name or transaction description (string)
- "amount": signed number in EUR, negative for debits/spending, positive for credits/income
- "currency": ISO 4217 currency code (default "EUR")

Skip non-transaction lines (headers, footers, account info, running balances).
If a date cannot be determined, use the nearest date visible in context.

Bank statement text:
${text.slice(0, 12000)}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from extraction model')

  // Strip any markdown code fences if present
  const raw = content.text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Extraction model returned invalid JSON. Please try again.')
  }

  if (!Array.isArray(parsed)) throw new Error('Extraction model did not return an array.')

  const rows: NormalisedRow[] = []
  for (const item of parsed as Record<string, unknown>[]) {
    const amount = Number(item.amount)
    const date = String(item.date ?? '')
    const description = String(item.description ?? '').trim()
    if (!date || !description || isNaN(amount)) continue
    rows.push({
      date,
      description,
      amount,
      currency: String(item.currency ?? 'EUR'),
    })
  }

  return rows
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const bank = formData.get('bank') as BankId | null

  if (!file || !bank) {
    return NextResponse.json({ error: 'Missing file or bank' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
  }

  let rows: NormalisedRow[]
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    rows = await extractTransactionsFromPdf(buffer, bank)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to extract transactions from PDF'
    return NextResponse.json({ error: message }, { status: 422 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No transactions found in this PDF' }, { status: 422 })
  }

  // Hand off to the same ingest pipeline as CSV
  const ingestRes = await fetch(new URL('/api/transactions/ingest', request.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the session cookie so the supabase server client can auth
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ rows, filename: file.name, source: bank }),
  })

  const result = await ingestRes.json()
  return NextResponse.json(result, { status: ingestRes.status })
}
