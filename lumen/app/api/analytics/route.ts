import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // optional "YYYY-MM"

  let query = supabase
    .from('transactions')
    .select('amount, category, completed_date, description, currency')
    .eq('user_id', user.id)
    .order('completed_date', { ascending: true })

  if (month) {
    query = query
      .gte('completed_date', `${month}-01`)
      .lt('completed_date', nextMonth(month))
  }

  const { data: txs, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = txs ?? []

  let totalIncome = 0
  let totalExpenses = 0
  const byCategory: Record<string, number> = {}
  const monthMap: Record<string, { income: number; expenses: number }> = {}
  const merchantMap: Record<string, { total: number; count: number }> = {}
  const descMonths: Record<string, Set<string>> = {}

  for (const tx of rows) {
    const amount = Number(tx.amount)
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

    if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0 }
    if (amount > 0) monthMap[monthKey].income += amount
    else monthMap[monthKey].expenses += Math.abs(amount)

    if (!descMonths[tx.description]) descMonths[tx.description] = new Set()
    descMonths[tx.description].add(monthKey)
  }

  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

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

function nextMonth(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m, 1) // month is 0-indexed, so m = next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
