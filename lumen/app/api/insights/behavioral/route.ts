import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  BehavioralInsightsData,
  SmallLeaksData,
  CategoryDriftItem,
  AnnualProjectionItem,
  PaydaySplurgeData,
  EssentialRatioMonth,
  IncomeCandidate,
} from '@/lib/types'

const ESSENTIAL_PATTERNS = [
  'grocery',
  'supermarket',
  'transport',
  'commuter',
  'rail',
  'bus',
  'taxicab',
  'parking',
  'fuel',
  'service station',
  'utility',
  'electric',
  'telecom',
  'medical',
  'health',
  'pharmacy',
  'drug store',
  'hospital',
]

const DISCRETIONARY_PATTERNS = [
  'restaurant',
  'eating place',
  'bar',
  'cafe',
  'digital goods',
  'entertainment',
  'recreation',
  'sports',
  'subscription',
  'specialty retail',
  'department store',
  'clothing',
  'apparel',
  'electronics',
  'hobby',
  'gaming',
]

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function monthOf(completed: string): string {
  return String(completed).substring(0, 7)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateStr(d)
}

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return dateStr(d)
}

function normalizeCategory(category: string | null | undefined) {
  return String(category ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function spendingGroup(category: string | null | undefined): 'essential' | 'discretionary' | null {
  const normalized = normalizeCategory(category)
  if (!normalized || normalized === 'uncategorized') return null
  if (ESSENTIAL_PATTERNS.some((pattern) => normalized.includes(pattern))) return 'essential'
  if (DISCRETIONARY_PATTERNS.some((pattern) => normalized.includes(pattern))) return 'discretionary'
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const salaryDesc = searchParams.get('salaryDesc')?.trim() ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Two queries: 6 months for insights, 12 months for income candidate discovery
  const [insightsRes, candidatesRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category, completed_date, description')
      .eq('user_id', user.id)
      .gte('completed_date', monthsAgo(6))
      .order('completed_date', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, description, completed_date, started_at')
      .eq('user_id', user.id)
      .gt('amount', 0),
  ])

  if (insightsRes.error) return NextResponse.json({ error: insightsRes.error.message }, { status: 500 })
  const txs = insightsRes.data ?? []
  const candidateRows = candidatesRes.data ?? []

  // ── 1. Small Leaks ────────────────────────────────────────────────────────
  const thirtyAgo = daysAgo(30)
  const leakTxs = txs.filter(tx => {
    const amt = Number(tx.amount)
    return amt < 0 && amt > -10 && String(tx.completed_date) >= thirtyAgo
  })

  const leakByCat: Record<string, { total: number; count: number }> = {}
  let leakTotal = 0
  for (const tx of leakTxs) {
    const amt = Math.abs(Number(tx.amount))
    const cat = tx.category ?? 'Other'
    if (!leakByCat[cat]) leakByCat[cat] = { total: 0, count: 0 }
    leakByCat[cat].total += amt
    leakByCat[cat].count++
    leakTotal += amt
  }

  const smallLeaks: SmallLeaksData = {
    total: Math.round(leakTotal * 100) / 100,
    count: leakTxs.length,
    topCategories: Object.entries(leakByCat)
      .map(([category, v]) => ({ category, total: Math.round(v.total * 100) / 100, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  }

  // ── 2. Category Drift ─────────────────────────────────────────────────────
  const expenseMonths = txs
    .filter(tx => Number(tx.amount) < 0 && tx.completed_date)
    .map(tx => monthOf(tx.completed_date))
    .sort()
  const currentMonth = expenseMonths[expenseMonths.length - 1] ?? monthOf(dateStr(new Date()))
  const prevMonths: string[] = []
  const [currentYear, currentMonthIndex] = currentMonth.split('-').map(Number)
  for (let i = 1; i <= 3; i++) {
    const d = new Date(currentYear, currentMonthIndex - 1 - i, 1)
    prevMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const curByCat: Record<string, number> = {}
  const prevByCatMonth: Record<string, Record<string, number>> = {}

  for (const tx of txs) {
    if (Number(tx.amount) >= 0) continue
    const amt = Math.abs(Number(tx.amount))
    const cat = tx.category ?? 'Other'
    const mo = monthOf(tx.completed_date)

    if (mo === currentMonth) {
      curByCat[cat] = (curByCat[cat] ?? 0) + amt
    } else if (prevMonths.includes(mo)) {
      if (!prevByCatMonth[cat]) prevByCatMonth[cat] = {}
      prevByCatMonth[cat][mo] = (prevByCatMonth[cat][mo] ?? 0) + amt
    }
  }

  const categoryDrift: CategoryDriftItem[] = []
  const allCats = Array.from(new Set([...Object.keys(curByCat), ...Object.keys(prevByCatMonth)]))
  for (const cat of allCats) {
    const current = curByCat[cat] ?? 0
    const prevAmounts = Object.values(prevByCatMonth[cat] ?? {})
    if (current < 5) continue
    if (prevAmounts.length === 0) continue
    const avgMonthly = prevAmounts.reduce((a, b) => a + b, 0) / prevMonths.length
    if (avgMonthly < 5) continue
    const deltaPct = Math.round(((current - avgMonthly) / avgMonthly) * 100)
    if (Math.abs(deltaPct) < 20) continue
    categoryDrift.push({
      category: cat,
      currentMonthly: Math.round(current * 100) / 100,
      avgMonthly: Math.round(avgMonthly * 100) / 100,
      deltaPct,
      direction: deltaPct > 0 ? 'up' : 'down',
    })
  }
  categoryDrift.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))

  // ── 3. Annual Projection ──────────────────────────────────────────────────
  const sixtyAgo = daysAgo(60)
  const recentExp = txs.filter(tx => Number(tx.amount) < 0 && String(tx.completed_date) >= sixtyAgo)
  const projByCat: Record<string, number> = {}
  for (const tx of recentExp) {
    const cat = tx.category ?? 'Other'
    projByCat[cat] = (projByCat[cat] ?? 0) + Math.abs(Number(tx.amount))
  }

  const annualProjection: AnnualProjectionItem[] = Object.entries(projByCat)
    .map(([category, twoMonthTotal]) => ({
      category,
      monthlyAvg: Math.round((twoMonthTotal / 2) * 100) / 100,
      annualProjected: Math.round(twoMonthTotal / 2 * 12 * 100) / 100,
    }))
    .filter(p => p.annualProjected >= 50)
    .sort((a, b) => b.annualProjected - a.annualProjected)

  // ── 4. Payday Splurge ─────────────────────────────────────────────────────
  // Build income candidates from the wider 12-month window
  const incomeByDesc: Record<string, { total: number; count: number }> = {}
  for (const tx of candidateRows) {
    const desc = String(tx.description ?? '').trim()
    if (!desc) continue
    if (!incomeByDesc[desc]) incomeByDesc[desc] = { total: 0, count: 0 }
    incomeByDesc[desc].total += Number(tx.amount)
    incomeByDesc[desc].count++
  }
  const incomeCandidates: IncomeCandidate[] = Object.entries(incomeByDesc)
    .map(([description, v]) => ({
      description,
      avgAmount: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.avgAmount - a.avgAmount)

  // Use user-pinned salary desc if provided, otherwise fall back to >€200 heuristic.
  // Use candidateRows (no date filter) when matching by description so null completed_date
  // transfers aren't excluded.
  const incomeTxs = salaryDesc
    ? candidateRows.filter(tx => String(tx.description ?? '').trim() === salaryDesc)
    : candidateRows.filter(tx => Number(tx.amount) > 200)

  let paydaySplurge: PaydaySplurgeData | null = null

  if (incomeTxs.length > 0) {
    const postPaydayDates = new Set<string>()
    for (const inc of incomeTxs) {
      const dateStr = (inc.completed_date ?? (inc as Record<string, unknown>).started_at ?? '')
      if (!dateStr) continue
      const base = new Date(String(dateStr).substring(0, 10) + 'T12:00:00')
      for (let d = 0; d <= 6; d++) {
        const day = new Date(base)
        day.setDate(day.getDate() + d)
        postPaydayDates.add(dateStr(day))
      }
    }

    // Aggregate expense totals per day
    const dailyExp: Record<string, number> = {}
    for (const tx of txs) {
      if (Number(tx.amount) >= 0) continue
      const day = String(tx.completed_date).substring(0, 10)
      dailyExp[day] = (dailyExp[day] ?? 0) + Math.abs(Number(tx.amount))
    }

    let postTotal = 0; let postDays = 0
    let otherTotal = 0; let otherDays = 0

    for (const [day, total] of Object.entries(dailyExp)) {
      if (postPaydayDates.has(day)) { postTotal += total; postDays++ }
      else { otherTotal += total; otherDays++ }
    }

    if (otherDays > 0 && postDays > 0) {
      const avgPost = postTotal / postDays
      const avgOther = otherTotal / otherDays
      paydaySplurge = {
        avgDailyPostPayday: Math.round(avgPost * 100) / 100,
        avgDailyOther: Math.round(avgOther * 100) / 100,
        ratio: Math.round((avgPost / avgOther) * 10) / 10,
        paydayWindowTotal: Math.round(postTotal * 100) / 100,
        otherWindowTotal: Math.round(otherTotal * 100) / 100,
        paydayWindowDays: postDays,
        otherWindowDays: otherDays,
      }
    }
  }

  // ── 5. Essential vs Discretionary ratio ───────────────────────────────────
  const ratioByMonth: Record<string, { essential: number; discretionary: number }> = {}
  for (const tx of txs) {
    if (Number(tx.amount) >= 0) continue
    const cat = tx.category ?? 'Other'
    const mo = monthOf(tx.completed_date)
    if (!ratioByMonth[mo]) ratioByMonth[mo] = { essential: 0, discretionary: 0 }
    const amt = Math.abs(Number(tx.amount))
    const group = spendingGroup(cat)
    if (group === 'essential') ratioByMonth[mo].essential += amt
    else if (group === 'discretionary') ratioByMonth[mo].discretionary += amt
  }

  const essentialRatio: EssentialRatioMonth[] = Object.entries(ratioByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const total = v.essential + v.discretionary
      return {
        month,
        essentialTotal: Math.round(v.essential * 100) / 100,
        discretionaryTotal: Math.round(v.discretionary * 100) / 100,
        essentialPct: total > 0 ? Math.round((v.essential / total) * 100) : 0,
      }
    })
    .filter(m => m.essentialTotal + m.discretionaryTotal > 0)

  const result: BehavioralInsightsData = {
    smallLeaks,
    categoryDrift,
    annualProjection,
    paydaySplurge,
    paydaySalaryDesc: salaryDesc,
    incomeCandidates,
    essentialRatio,
  }

  return NextResponse.json(result)
}
