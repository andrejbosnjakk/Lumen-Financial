import { parseCSVRow, parseNum } from './csv'

export type DEGIROPosition = {
  isin: string
  name: string
  quantity: number
  avgCost: number
  currency: string
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

/**
 * Parse a DEGIRO CSV export.
 *
 * Handles two formats:
 * A) Transaction overview ("Transacties"):
 *    Datum, Product, ISIN, Beurs, Type, Aantal, Koers, <cur>, ...
 * B) Account statement ("Rekeningafschrift"):
 *    Datum, Tijd, Valutadatum, Product, ISIN, Omschrijving, FX, Mutatie, <cur>, Saldo, <cur>, Order Id
 *
 * Reconstructs open positions via running weighted-average cost.
 */
export function parseDEGIRO(csvText: string): DEGIROPosition[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const header = parseCSVRow(lines[0]).map(h => h.toLowerCase())

  // Column index helper (case-insensitive, first match wins)
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n.toLowerCase())
      if (i >= 0) return i
    }
    return -1
  }

  const isinIdx   = idx('isin')
  const prodIdx   = idx('product')
  const typeIdx   = idx('type', 'transactie type', 'transaction type')
  const aantalIdx = idx('aantal', 'quantity', 'shares', 'hoeveelheid')
  const koersIdx  = idx('koers', 'price', 'koers ', 'prijs')
  const descIdx   = idx('omschrijving', 'description')
  const fxIdx     = idx('fx', 'valuta', 'currency', 'munt')

  // Decide which format we have
  const hasExplicitType = typeIdx >= 0 && aantalIdx >= 0 && koersIdx >= 0

  // Running holdings: isin → { name, qty, totalCost, currency }
  const holdings = new Map<string, { name: string; qty: number; totalCost: number; currency: string }>()

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i])

    const isin = isinIdx >= 0 ? (cols[isinIdx] ?? '').trim() : ''
    if (!ISIN_RE.test(isin)) continue

    const name     = prodIdx >= 0 ? (cols[prodIdx] ?? '').trim() : isin
    const currency = fxIdx >= 0 ? (cols[fxIdx] ?? 'EUR').trim() : 'EUR'

    let qty   = 0
    let price = 0

    if (hasExplicitType) {
      // Format A: explicit Type / Aantal / Koers columns
      const type = (cols[typeIdx] ?? '').trim().toLowerCase()
      if (!['koop', 'buy', 'verkoop', 'sell'].includes(type)) continue
      const raw = parseNum(cols[aantalIdx] ?? '')
      price = parseNum(cols[koersIdx] ?? '')
      qty = type === 'koop' || type === 'buy' ? raw : -raw
    } else if (descIdx >= 0) {
      // Format B: parse from Omschrijving "Koop X @ Y EUR" / "Verkoop X @ Y EUR"
      const desc = (cols[descIdx] ?? '').trim()
      const parsed = parseOmschrijving(desc)
      if (!parsed) continue
      qty   = parsed.qty
      price = parsed.price
    } else {
      continue
    }

    if (qty === 0 || price === 0) continue

    const h = holdings.get(isin) ?? { name, qty: 0, totalCost: 0, currency }
    if (qty > 0) {
      h.totalCost += qty * price
      h.qty += qty
    } else {
      const sellQty = Math.abs(qty)
      const avg = h.qty > 0 ? h.totalCost / h.qty : price
      h.totalCost -= sellQty * avg
      h.qty = Math.max(0, h.qty - sellQty)
    }
    if (h.qty < 0.0001) h.totalCost = 0
    holdings.set(isin, h)
  }

  return Array.from(holdings.entries())
    .filter(([, h]) => h.qty > 0.0001)
    .map(([isin, h]) => ({
      isin,
      name: h.name,
      quantity: Math.round(h.qty * 1_000_000) / 1_000_000,
      avgCost: h.qty > 0 ? Math.round((h.totalCost / h.qty) * 100) / 100 : 0,
      currency: h.currency,
    }))
}

function parseOmschrijving(desc: string): { qty: number; price: number } | null {
  // "Koop 10 @ 100,50 EUR"  or  "Verkoop 5 @ 155.00 USD"
  const m = desc.match(/^(Koop|Verkoop)\s+([\d.,]+)\s*@\s*([\d.,]+)/i)
  if (!m) return null
  const isBuy = m[1].toLowerCase() === 'koop'
  const raw = parseNum(m[2])
  const price = parseNum(m[3])
  return { qty: isBuy ? raw : -raw, price }
}
