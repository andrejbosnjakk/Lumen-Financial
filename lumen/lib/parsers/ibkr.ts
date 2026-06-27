import { parseCSVRow, parseNum } from './csv'

export type IBKRPosition = {
  symbol: string
  currency: string
  quantity: number
  costPrice: number   // average cost per share
  closePrice: number  // end-of-day price from statement
  unrealizedPnl: number
}

/**
 * Parse an IBKR Activity Statement CSV.
 *
 * The file uses a multi-section row-prefix format:
 *   "Open Positions,Header,DataDiscriminator,Asset Category,Currency,Symbol,..."
 *   "Open Positions,Data,Summary,Stocks,USD,AAPL,..."
 *
 * We also fall back to reconstructing from "Trades" rows if Open Positions is absent.
 */
export function parseIBKR(csvText: string): IBKRPosition[] {
  const lines = csvText.split(/\r?\n/)

  let opHeaders: string[] = []
  const openPositions: IBKRPosition[] = []

  // Trades fallback
  let tradeHeaders: string[] = []
  const tradeMap = new Map<string, { qty: number; totalCost: number; lastPrice: number; currency: string }>()

  for (const line of lines) {
    if (!line.trim()) continue
    const cols = parseCSVRow(line)
    if (cols.length < 2) continue

    const section = cols[0]
    const rowType = cols[1]
    const data = cols.slice(2)

    // --- Open Positions section ---
    if (section === 'Open Positions') {
      if (rowType === 'Header') {
        opHeaders = data
        continue
      }
      if (rowType === 'Data' && opHeaders.length > 0) {
        const get = (name: string) => {
          const idx = opHeaders.indexOf(name)
          return idx >= 0 ? (data[idx] ?? '').trim() : ''
        }
        if (get('DataDiscriminator') !== 'Summary') continue
        const cat = get('Asset Category')
        if (!['Stocks', 'ETF', 'Fund', 'Bond'].includes(cat)) continue

        const qty = parseNum(get('Quantity'))
        if (qty <= 0) continue

        openPositions.push({
          symbol: get('Symbol'),
          currency: get('Currency'),
          quantity: qty,
          costPrice: parseNum(get('Cost Price')),
          closePrice: parseNum(get('Close Price')),
          unrealizedPnl: parseNum(get('Unrealized P/L')),
        })
      }
      continue
    }

    // --- Trades section (fallback if Open Positions missing) ---
    if (section === 'Trades') {
      if (rowType === 'Header') {
        tradeHeaders = data
        continue
      }
      if (rowType === 'Data' && tradeHeaders.length > 0) {
        const get = (name: string) => {
          const idx = tradeHeaders.indexOf(name)
          return idx >= 0 ? (data[idx] ?? '').trim() : ''
        }
        if (get('DataDiscriminator') !== 'Order') continue
        const cat = get('Asset Category')
        if (!['Stocks', 'ETF', 'Fund', 'Bond'].includes(cat)) continue

        const symbol = get('Symbol')
        const qty = parseNum(get('Quantity'))   // negative for sells
        const price = parseNum(get('T. Price'))
        const currency = get('Currency')
        const closePrice = parseNum(get('C. Price'))

        const existing = tradeMap.get(symbol) ?? { qty: 0, totalCost: 0, lastPrice: 0, currency }
        if (qty > 0) {
          existing.totalCost += qty * price
          existing.qty += qty
        } else {
          const sellQty = Math.abs(qty)
          const avg = existing.qty > 0 ? existing.totalCost / existing.qty : price
          existing.totalCost -= sellQty * avg
          existing.qty = Math.max(0, existing.qty - sellQty)
        }
        existing.lastPrice = closePrice || price
        tradeMap.set(symbol, existing)
      }
    }
  }

  // Prefer Open Positions; fall back to Trades reconstruction
  if (openPositions.length > 0) return openPositions

  return Array.from(tradeMap.entries())
    .filter(([, v]) => v.qty > 0.0001)
    .map(([symbol, v]) => ({
      symbol,
      currency: v.currency,
      quantity: v.qty,
      costPrice: v.qty > 0 ? v.totalCost / v.qty : 0,
      closePrice: v.lastPrice,
      unrealizedPnl: v.qty * (v.lastPrice - (v.qty > 0 ? v.totalCost / v.qty : 0)),
    }))
}
