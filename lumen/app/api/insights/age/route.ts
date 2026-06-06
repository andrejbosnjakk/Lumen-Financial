import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { AgeComparison } from '@/lib/types'

export type { AgeComparison }

const VALID_AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+']
const CATEGORY_ALIASES: Record<string, string> = {
  'Restaurants & Food': 'Dining',
  Restaurant: 'Dining',
  Restaurants: 'Dining',
  Food: 'Dining',
  Fitness: 'Health',
  Healthcare: 'Health',
  Medical: 'Health',
  Utilities: 'Housing',
  Rent: 'Housing',
  Other: 'Other',
}

let benchmarkCache: Record<string, Record<string, number>> | null = null

function getBenchmarks(): Record<string, Record<string, number>> {
  if (!benchmarkCache) {
    const raw = readFileSync(join(process.cwd(), 'public/data/age-benchmarks.json'), 'utf-8')
    benchmarkCache = JSON.parse(raw)
  }
  return benchmarkCache!
}

function normalizeCategory(category: string | null) {
  const raw = (category || 'Other').trim()
  return CATEGORY_ALIASES[raw] ?? raw
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ageGroup = new URL(request.url).searchParams.get('ageGroup') ?? ''
  if (!VALID_AGE_GROUPS.includes(ageGroup)) {
    return NextResponse.json({ error: 'Invalid ageGroup. Must be one of: ' + VALID_AGE_GROUPS.join(', ') }, { status: 400 })
  }

  // Get user's last 3 months of spending by category
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, category, completed_date')
    .eq('user_id', user.id)
    .lt('amount', 0)
    .gte('completed_date', threeMonthsAgo.toISOString().split('T')[0])

  if (!txs || txs.length === 0) return NextResponse.json({ comparisons: [] })

  // Compute user's monthly average per category (3-month window = divide by 3)
  const categoryTotals: Record<string, number> = {}
  for (const tx of txs) {
    const cat = normalizeCategory(tx.category)
    if (cat === 'Income' || cat === 'Transfers' || cat === 'Savings') continue
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(Number(tx.amount))
  }

  const benchmarks = getBenchmarks()
  const ageBenchmark = benchmarks[ageGroup] ?? {}

  const comparisons: AgeComparison[] = []

  for (const [category, totalSpend] of Object.entries(categoryTotals)) {
    const userMonthly = totalSpend / 3
    const benchmarkMonthly = ageBenchmark[category]
    if (!benchmarkMonthly) continue  // no benchmark for this category

    const ratio = userMonthly / benchmarkMonthly

    let direction: AgeComparison['direction'] = 'on-par'
    if (ratio > 1.25) direction = 'over'
    else if (ratio < 0.75) direction = 'under'

    comparisons.push({ category, userMonthly: Math.round(userMonthly * 100) / 100, benchmarkMonthly: Math.round(benchmarkMonthly * 100) / 100, ratio: Math.round(ratio * 100) / 100, direction })
  }

  comparisons.sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))

  return NextResponse.json({ ageGroup, comparisons })
}
