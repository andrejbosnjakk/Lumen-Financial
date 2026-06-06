import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // e.g. "2025-05"

  // Build date range
  let fromDate: string
  let toDate: string
  if (month) {
    const [year, mon] = month.split('-').map(Number)
    fromDate = new Date(year, mon - 1, 1).toISOString()
    toDate = new Date(year, mon, 1).toISOString()
  } else {
    // All time
    fromDate = '2000-01-01T00:00:00.000Z'
    toDate = new Date(Date.now() + 86400000).toISOString()
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category, description, completed_date, currency')
    .eq('user_id', user.id)
    .gte('completed_date', fromDate)
    .lt('completed_date', toDate)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const txs = transactions ?? []

  // Totals
  let totalIncome = 0
  let totalExpenses = 0
  for (const tx of txs) {
    if (tx.amount > 0) totalIncome += tx.amount
    else totalExpenses += Math.abs(tx.amount)
  }
  const netSavings = totalIncome - totalExpenses

  // Spending by category (expenses only)
  const byCategory: Record<string, number> = {}
  for (const tx of txs) {
    if (tx.amount < 0) {
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + Math.abs(tx.amount)
    }
  }

  // Income vs expenses by month (last 6 months)
  const monthMap: Record<string, { income: number; expenses: number }> = {}
  for (const tx of txs) {
    const m = tx.completed_date.slice(0, 7) // "YYYY-MM"
    if (!monthMap[m]) monthMap[m] = { income: 0, expenses: 0 }
    if (tx.amount > 0) monthMap[m].income += tx.amount
    else monthMap[m].expenses += Math.abs(tx.amount)
  }
  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }))

  // Top merchants (expenses, by total spent)
  const merchantMap: Record<string, { total: number; count: number }> = {}
  for (const tx of txs) {
    if (tx.amount < 0) {
      const key = tx.description.trim()
      if (!merchantMap[key]) merchantMap[key] = { total: 0, count: 0 }
      merchantMap[key].total += Math.abs(tx.amount)
      merchantMap[key].count += 1
    }
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([description, vals]) => ({ description, ...vals }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Recurring: transactions appearing 2+ times with same description
  const recurringMap: Record<string, number> = {}
  for (const tx of txs) {
    recurringMap[tx.description] = (recurringMap[tx.description] ?? 0) + 1
  }
  const recurringDescriptions = new Set(
    Object.entries(recurringMap).filter(([, c]) => c >= 2).map(([d]) => d)
  )
  const recurring = txs.filter((tx) => recurringDescriptions.has(tx.description))

  return NextResponse.json({
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    byCategory,
    byMonth,
    topMerchants,
    recurring,
  })
}
