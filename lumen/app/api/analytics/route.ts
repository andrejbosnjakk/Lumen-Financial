import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Granularity = 'day' | 'week' | 'month'

function getPeriodKey(dateStr: string, granularity: Granularity): string {
  const s = String(dateStr).substring(0, 10)
  if (granularity === 'day') return s
  if (granularity === 'month') return String(dateStr).substring(0, 7)
  // week → Monday of that week
  const d = new Date(s + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function fillGaps(
  map: Record<string, { income: number; expenses: number }>,
  from: string | null,
  to: string | null,
  granularity: Granularity
): { month: string; income: number; expenses: number }[] {
  // No date range — just return sorted data as-is (all-time view)
  if (!from || !to) {
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }))
  }

  const out: { month: string; income: number; expenses: number }[] = []

  if (granularity === 'day') {
    const end = new Date(to + 'T12:00:00')
    for (let d = new Date(from + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      out.push({ month: key, ...(map[key] ?? { income: 0, expenses: 0 }) })
    }
  } else if (granularity === 'week') {
    // Start from Monday of the from-week
    const start = new Date(from + 'T12:00:00')
    const startDay = start.getDay()
    start.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1))
    const end = new Date(to + 'T12:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const key = d.toISOString().split('T')[0]
      out.push({ month: key, ...(map[key] ?? { income: 0, expenses: 0 }) })
    }
  } else {
    // Month — iterate month by month
    const [fy, fm] = from.split('-').map(Number)
    const [ty, tm] = to.split('-').map(Number)
    let y = fy, m = fm
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      out.push({ month: key, ...(map[key] ?? { income: 0, expenses: 0 }) })
      m++
      if (m > 12) { m = 1; y++ }
    }
  }

  return out
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const granularity: Granularity = (searchParams.get('granularity') as Granularity) ?? 'month'

  let query = supabase
    .from('transactions')
    .select('amount, category, completed_date, description, currency')
    .eq('user_id', user.id)
    .order('completed_date', { ascending: true })

  if (from) query = query.gte('completed_date', from)
  if (to) {
    const nextDay = new Date(to + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    query = query.lt('completed_date', nextDay.toISOString().split('T')[0])
  }

  const { data: txs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = txs ?? []

  let totalIncome = 0
  let totalExpenses = 0
  const byCategory: Record<string, number> = {}
  const periodMap: Record<string, { income: number; expenses: number }> = {}
  const merchantMap: Record<string, { total: number; count: number }> = {}
  const descMonths: Record<string, Set<string>> = {}

  for (const tx of rows) {
    const amount = Number(tx.amount)
    const periodKey = getPeriodKey(String(tx.completed_date), granularity)
    const monthKey = String(tx.completed_date).substring(0, 7)

    if (amount > 0) {
      totalIncome += amount
    } else {
      totalExpenses += Math.abs(amount)
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + Math.abs(amount)
      if (!merchantMap[tx.description]) merchantMap[tx.description] = { total: 0, count: 0 }
      merchantMap[tx.description].total += Math.abs(amount)
      merchantMap[tx.description].count++
    }

    if (!periodMap[periodKey]) periodMap[periodKey] = { income: 0, expenses: 0 }
    if (amount > 0) periodMap[periodKey].income += amount
    else periodMap[periodKey].expenses += Math.abs(amount)

    if (!descMonths[tx.description]) descMonths[tx.description] = new Set()
    descMonths[tx.description].add(monthKey)
  }

  const byMonth = fillGaps(periodMap, from, to, granularity)

  const topMerchants = Object.entries(merchantMap)
    .map(([description, v]) => ({ description, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const recurringDescs = new Set(
    Object.entries(descMonths)
      .filter(([, months]) => months.size >= 2)
      .map(([desc]) => desc)
  )
  const recurring = rows.filter((tx) => recurringDescs.has(tx.description))

  return NextResponse.json({
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    byCategory,
    byMonth,
    topMerchants,
    recurring,
  })
}
