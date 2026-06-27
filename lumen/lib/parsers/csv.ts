/** Parse a single CSV row, handling quoted fields and escaped quotes. */
export function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur.trim())
  return result
}

/** Parse a number that may use European (1.234,56) or US (1,234.56) formatting. */
export function parseNum(s: string): number {
  const t = s.replace(/['"]/g, '').trim()
  if (!t || t === '-') return 0
  // European: has both separators, comma comes last
  if (t.includes('.') && t.includes(',')) {
    const dotIdx = t.lastIndexOf('.')
    const comIdx = t.lastIndexOf(',')
    if (comIdx > dotIdx) return parseFloat(t.replace(/\./g, '').replace(',', '.'))
    return parseFloat(t.replace(/,/g, ''))
  }
  // Only comma → decimal separator
  if (t.includes(',') && !t.includes('.')) return parseFloat(t.replace(',', '.'))
  // Only dot or nothing special
  return parseFloat(t.replace(/,/g, '')) || 0
}
