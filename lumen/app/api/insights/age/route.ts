import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { AgeComparison } from '@/lib/types'

export type { AgeComparison }

const VALID_AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+']
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
  const normalized = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (!normalized || normalized === 'uncategorized') return 'Other'
  if (normalized.includes('transfer') || normalized.includes('allowance') || normalized.includes('salary')) return 'Other'
  if (normalized.includes('grocery') || normalized.includes('supermarket')) return 'Groceries'
  if (
    normalized.includes('transport') ||
    normalized.includes('commuter') ||
    normalized.includes('rail') ||
    normalized.includes('bus') ||
    normalized.includes('taxicab') ||
    normalized.includes('parking') ||
    normalized.includes('airline') ||
    normalized.includes('fuel') ||
    normalized.includes('service station')
  ) return 'Transport'
  if (
    normalized.includes('digital goods') ||
    normalized.includes('software') ||
    normalized.includes('streaming') ||
    normalized.includes('subscription') ||
    normalized.includes('telecom') ||
    normalized.includes('membership')
  ) return 'Subscriptions'
  if (
    normalized.includes('restaurant') ||
    normalized.includes('eating place') ||
    normalized.includes('drinking place') ||
    normalized.includes('bar') ||
    normalized.includes('cafe')
  ) return 'Dining'
  if (
    normalized.includes('medical') ||
    normalized.includes('health') ||
    normalized.includes('pharmacy') ||
    normalized.includes('drug store') ||
    normalized.includes('hospital') ||
    normalized.includes('sports') ||
    normalized.includes('recreation')
  ) return 'Health'
  if (
    normalized.includes('retail') ||
    normalized.includes('department store') ||
    normalized.includes('clothing') ||
    normalized.includes('apparel') ||
    normalized.includes('electronics') ||
    normalized.includes('specialty')
  ) return 'Shopping'
  if (
    normalized.includes('entertainment') ||
    normalized.includes('gaming') ||
    normalized.includes('movie') ||
    normalized.includes('theatre') ||
    normalized.includes('club')
  ) return 'Entertainment'
  if (
    normalized.includes('utility') ||
    normalized.includes('electric') ||
    normalized.includes('gas') ||
    normalized.includes('water')
  ) return 'Utilities'
  if (
    normalized.includes('rent') ||
    normalized.includes('housing') ||
    normalized.includes('mortgage') ||
    normalized.includes('hotel') ||
    normalized.includes('lodging')
  ) return 'Housing'

  return 'Other'
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
